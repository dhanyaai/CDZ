import { useLocation } from "wouter";
import { LogOut, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { navItems } from "@/lib/nav";
import { useTheme } from "@/lib/theme";
import { logout } from "@/lib/auth";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, navigate] = useLocation();
  const { theme, toggle } = useTheme();

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <DialogDescription className="sr-only">
        Search modules and quick actions
      </DialogDescription>
      <CommandInput placeholder="Search modules and actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navItems.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${group.group} ${item.label}`}
                onSelect={() => go(item.href)}
              >
                <item.icon className="text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="settings preferences"
            onSelect={() => go("/settings")}
          >
            <SettingsIcon className="text-muted-foreground" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem
            value="toggle theme dark light mode"
            onSelect={() => {
              onOpenChange(false);
              toggle();
            }}
          >
            {theme === "dark" ? (
              <Sun className="text-muted-foreground" />
            ) : (
              <Moon className="text-muted-foreground" />
            )}
            <span>Switch to {theme === "dark" ? "light" : "dark"} mode</span>
          </CommandItem>
          <CommandItem
            value="sign out logout"
            onSelect={() => {
              onOpenChange(false);
              void logout();
            }}
          >
            <LogOut className="text-muted-foreground" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
