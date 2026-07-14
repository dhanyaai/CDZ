type TransitionMap = Record<string, string[]>;

export const SO_TRANSITIONS: TransitionMap = {
  Draft:              ["Confirmed", "Cancelled"],
  Confirmed:          ["In Production", "Cancelled"],
  "In Production":    ["Ready to Dispatch"],
  "Ready to Dispatch":["Dispatched"],
  Dispatched:         ["Delivered"],
  Delivered:          [],
  Cancelled:          [],
};

export const PO_TRANSITIONS: TransitionMap = {
  Draft:               ["Ordered", "Cancelled"],
  Ordered:             ["Partially Received", "Fully Received", "Cancelled"],
  "Partially Received":["Fully Received", "Cancelled"],
  "Fully Received":    [],
  Cancelled:           [],
};

export const INVOICE_TRANSITIONS: TransitionMap = {
  Draft:            ["Issued", "Cancelled"],
  Issued:           ["Partially Paid", "Paid"],
  "Partially Paid": ["Paid"],
  Paid:             [],
  Cancelled:        [],
};

export const ASSEMBLY_TRANSITIONS: TransitionMap = {
  Pending:       ["In Progress"],
  "In Progress": ["Completed", "Rejected"],
  Completed:     [],
  Rejected:      ["Pending"],
};

export const SHIPMENT_TRANSITIONS: TransitionMap = {
  Created:          ["Label Generated"],
  "Label Generated":["In Transit"],
  "In Transit":     ["Delivered", "Returned"],
  Delivered:        [],
  Returned:         [],
};

export const ARTWORK_TRANSITIONS: TransitionMap = {
  "Pending Approval": ["Client Approved", "Rejected"],
  "Client Approved":  ["Sent to Vendor"],
  "Sent to Vendor":   ["Completed"],
  Completed:          [],
  Rejected:           ["Pending Approval"],
};

export function canTransition(map: TransitionMap, from: string, to: string): boolean {
  return (map[from] ?? []).includes(to);
}

export function validTransitions(map: TransitionMap, from: string): string[] {
  return map[from] ?? [];
}

export function assertTransition(map: TransitionMap, from: string, to: string, entity = "Record"): void {
  if (!canTransition(map, from, to)) {
    throw new StatusError(400, `${entity} cannot move from "${from}" to "${to}". Valid transitions: ${(map[from] ?? []).join(", ") || "none"}`);
  }
}

export class StatusError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "StatusError";
  }
}
