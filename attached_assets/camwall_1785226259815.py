#!/usr/bin/env python3
"""
camwall.py - Browser-based video wall for IP cameras.

Point it at cameras directly, at NVR channels, or any mix of the two.
It polls each JPEG snapshot endpoint, caches the latest frame in memory,
and serves it to a plain HTML grid that runs in any browser, including a TV.

The proxy is not optional: cameras use HTTP digest auth, and browsers refuse
to send credentials from an <img> tag. This logs in on their behalf.

Install:  pip install flask requests
Run:      python camwall.py
Open:     http://<this-machine-ip>:8080/
"""

import csv
import ipaddress
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from flask import Flask, Response, jsonify, send_from_directory
from requests.auth import HTTPBasicAuth, HTTPDigestAuth

# ---------------------------------------------------------------------------
# Snapshot paths by brand. stream 1 = main, 2 = sub (smaller, lighter).
# ---------------------------------------------------------------------------

SNAPSHOT_PATHS = {
    "hikvision": "/ISAPI/Streaming/channels/{stream}0{s}/picture",
    "dahua":     "/cgi-bin/snapshot.cgi?channel=1&subtype={sub}",
    "cpplus":    "/cgi-bin/snapshot.cgi?channel=1&subtype={sub}",
    "uniview":   "/images/snapshot.jpg",
    "axis":      "/axis-cgi/jpg/image.cgi",
}


def _path_for(brand, stream):
    tpl = SNAPSHOT_PATHS.get(brand)
    if tpl is None:
        raise ValueError("unknown brand %r - add it to SNAPSHOT_PATHS" % brand)
    return tpl.format(stream=1, s=stream, sub=stream - 1)


def cam(label, url, user=None, password=None, auth="digest", group=""):
    """A single camera at an explicit URL. Use this for anything unusual."""
    return {
        "label": label, "url": url, "group": group, "auth": auth,
        "user": user if user is not None else DEFAULT_USER,
        "password": password if password is not None else DEFAULT_PASS,
    }


def from_ip_range(prefix, first, last, brand="hikvision", stream=1, port=80,
                  group="", labels=None, user=None, password=None,
                  auth="digest"):
    """Cameras sitting directly on the LAN at sequential addresses.
       from_ip_range("192.168.1", 11, 30)  ->  .11 through .30"""
    out = []
    labels = labels or {}
    for i, octet in enumerate(range(first, last + 1), start=1):
        host = "%s.%d" % (prefix, octet)
        url = "http://%s:%d%s" % (host, port, _path_for(brand, stream))
        out.append(cam(labels.get(octet) or "%s %02d" % (group or "Cam", i),
                       url, user, password, auth, group))
    return out


def from_ip_list(hosts, brand="hikvision", stream=1, port=80, group="",
                 user=None, password=None, auth="digest"):
    """Cameras at scattered addresses. Pass a list of IPs, or a dict of
       {ip: label} when you want names."""
    out = []
    items = hosts.items() if isinstance(hosts, dict) else [(h, None) for h in hosts]
    for i, (host, label) in enumerate(items, start=1):
        url = "http://%s:%d%s" % (host, port, _path_for(brand, stream))
        out.append(cam(label or "%s %02d" % (group or "Cam", i),
                       url, user, password, auth, group))
    return out


def _channels(channels):
    """channels may be a count (20 -> 1..20) or an explicit list ([1, 3, 7])."""
    if isinstance(channels, int):
        return list(range(1, channels + 1))
    return list(channels)


def from_csv(path, brand="hikvision", stream=1, port=80, auth="digest",
             user=None, password=None):
    """Load cameras from a spreadsheet exported as CSV.

    Recognised columns (case and spacing do not matter):
        camera name / name      the label shown on the tile      required
        camera ip / ip          the camera's own address         optional
        nvr                     the NVR address                  optional
        channel                 channel number on that NVR       optional
        group                   which view it belongs to         optional
        user, password          per-camera login                 optional

    If camera ip is filled in, it goes direct to the camera. If it is blank
    and nvr + channel are filled in, it goes through the NVR instead. Group
    falls back to the nvr column so you get one view per NVR for free.
    """
    out = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for lineno, raw in enumerate(csv.DictReader(fh), start=2):
            row = {}
            for k, v in raw.items():
                if k:
                    row[k.strip().lower().replace(" ", "")] = (v or "").strip()

            label = row.get("cameraname") or row.get("name")
            if not label:
                continue

            ip = row.get("cameraip") or row.get("ip") or ""
            nvr = row.get("nvr") or ""
            channel = row.get("channel") or ""
            group = row.get("group") or nvr

            for field, value in (("camera ip", ip), ("nvr", nvr)):
                if value and not _valid_ip(value):
                    print("camwall: line %d, %s - %r is not a valid address, "
                          "skipping this row" % (lineno, field, value))
                    value = None
                    break
            else:
                if ip:
                    url = "http://%s:%d%s" % (ip, port, _path_for(brand, stream))
                elif nvr and channel:
                    url = ("http://%s:%d/ISAPI/Streaming/channels/%d0%d/picture"
                           % (nvr, port, int(channel), stream))
                else:
                    print("camwall: line %d, %r has no camera ip and no "
                          "nvr + channel, skipping" % (lineno, label))
                    continue
                out.append(cam(label, url,
                               row.get("user") or user,
                               row.get("password") or password,
                               auth, group))
    return out


def _valid_ip(value):
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def from_nvr(host, channels, brand="hikvision", stream=1, port=80, name="NVR",
             group=None, labels=None, user=None, password=None, auth="digest"):
    """Pull channels through the NVR instead of touching cameras directly.
       Use this when the cameras are unreachable from your LAN.
       channels: 20 for all of them, or [1, 3, 7] to pick."""
    out = []
    labels = labels or {}
    group = name if group is None else group
    for ch in _channels(channels):
        if brand == "hikvision":
            path = "/ISAPI/Streaming/channels/%d0%d/picture" % (ch, stream)
        else:
            path = "/cgi-bin/snapshot.cgi?channel=%d&subtype=%d" % (ch, stream - 1)
        url = "http://%s:%d%s" % (host, port, path)
        out.append(cam(labels.get(ch) or "%s CH%02d" % (name, ch),
                       url, user, password, auth, group))
    return out


def from_virtual_host(nvr_host, channels, name="NVR", group=None,
                      base_port=65001, stream=1, labels=None, user=None,
                      password=None, auth="digest"):
    """Hikvision Virtual Host: cameras plugged into the NVR's own PoE ports
       live on a hidden subnet, but the NVR will forward each one to a port.
       Channel 1 = 65001, channel 2 = 65002, and so on.
       Turn it on first: NVR > Network > Advanced > Other > Virtual Host."""
    out = []
    labels = labels or {}
    group = name if group is None else group
    for ch in _channels(channels):
        url = ("http://%s:%d/ISAPI/Streaming/channels/10%d/picture"
               % (nvr_host, base_port + ch - 1, stream))
        out.append(cam(labels.get(ch) or "%s CH%02d" % (name, ch),
                       url, user, password, auth, group))
    return out


# ===========================================================================
# CONFIG - edit from here down
# ===========================================================================

DEFAULT_USER = "camwall"
DEFAULT_PASS = "CHANGE_ME"

CAMERAS = []

# Your spreadsheet, exported as CSV into this same folder.
CAMERAS += from_csv("cameras.csv")

# Anything the sheet does not cover can still be added by hand:
# CAMERAS += from_nvr("10.10.15.194", [1, 3, 7], name="NVR 1")
# CAMERAS += [cam("Server room", "http://10.10.14.90/ISAPI/Streaming/channels/102/picture")]

REFRESH_SECONDS = 2.0     # per camera. Do not go below 1.0 with 80 cameras.
HTTP_TIMEOUT = 5
WORKERS = 12              # parallel fetches
STALE_SECONDS = 15        # no fresh frame for this long -> tile shows No signal
PORT = 8080

# ===========================================================================
# Nothing below here needs editing
# ===========================================================================

app = Flask(__name__, static_folder=None)
HERE = os.path.dirname(os.path.abspath(__file__))

_frames = {}
_status = {}
_lock = threading.Lock()
_tls = threading.local()

for _i, _c in enumerate(CAMERAS):
    _c["key"] = "c%03d" % (_i + 1)
    _c["code"] = "C%02d" % (_i + 1)


def session_for(c):
    """One session per worker thread per camera, so digest state and the
    keep-alive socket are never shared across threads."""
    if not hasattr(_tls, "sessions"):
        _tls.sessions = {}
    s = _tls.sessions.get(c["key"])
    if s is None:
        s = requests.Session()
        if c["auth"] == "digest":
            s.auth = HTTPDigestAuth(c["user"], c["password"])
        elif c["auth"] == "basic":
            s.auth = HTTPBasicAuth(c["user"], c["password"])
        _tls.sessions[c["key"]] = s
    return s


def fetch_one(c):
    key = c["key"]
    try:
        r = session_for(c).get(c["url"], timeout=HTTP_TIMEOUT)
        if r.status_code == 200 and r.content[:2] == b"\xff\xd8":
            with _lock:
                _frames[key] = (r.content, time.time())
                _status[key] = "ok"
        elif r.status_code == 401:
            with _lock:
                _status[key] = "auth failed"
        else:
            with _lock:
                _status[key] = "http %d" % r.status_code
    except requests.exceptions.Timeout:
        with _lock:
            _status[key] = "timeout"
    except Exception as exc:
        with _lock:
            _status[key] = type(exc).__name__


def poller():
    pool = ThreadPoolExecutor(max_workers=WORKERS)
    while True:
        started = time.time()
        list(pool.map(fetch_one, CAMERAS))
        elapsed = time.time() - started
        if elapsed < REFRESH_SECONDS:
            time.sleep(REFRESH_SECONDS - elapsed)


@app.route("/")
def index():
    return send_from_directory(HERE, "wall.html")


@app.route("/api/config")
def api_config():
    return jsonify({
        "refresh": REFRESH_SECONDS,
        "cameras": [
            {"key": c["key"], "code": c["code"],
             "label": c["label"], "group": c["group"]}
            for c in CAMERAS
        ],
    })


@app.route("/api/status")
def api_status():
    now = time.time()
    with _lock:
        return jsonify([
            {
                "key": c["key"],
                "label": c["label"],
                "url": c["url"],
                "state": _status.get(c["key"], "never fetched"),
                "age": round(now - _frames[c["key"]][1], 1)
                       if c["key"] in _frames else None,
            }
            for c in CAMERAS
        ])


@app.route("/snap/<key>.jpg")
def snap(key):
    with _lock:
        frame = _frames.get(key)
    if frame is None or (time.time() - frame[1]) > STALE_SECONDS:
        return Response("stale", status=503)
    resp = Response(frame[0], mimetype="image/jpeg")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    return resp


if __name__ == "__main__":
    print("camwall: %d cameras configured" % len(CAMERAS))
    print("camwall: open http://<this-machine-ip>:%d/ on the TV" % PORT)
    print("camwall: check http://<this-machine-ip>:%d/api/status while setting up"
          % PORT)
    threading.Thread(target=poller, daemon=True).start()
    app.run(host="0.0.0.0", port=PORT, threaded=True)
