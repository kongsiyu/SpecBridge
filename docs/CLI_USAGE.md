# CLI Usage Guide

## Installation

```bash
npm install -g specbridge
```

## Commands

### init

Initialize SpecBridge configuration in current directory.

```bash
specbridge init
```

Creates `.specbridge.yaml` with default configuration.

### sync

Perform one-time synchronization.

```bash
specbridge sync
```

Options:
- `--dry-run`: Preview changes without syncing
- `--target <name>`: Sync to specific target only

### watch

Continuously watch for spec changes and auto-sync.

```bash
specbridge watch
```

### status

Check synchronization status.

```bash
specbridge status
```

Shows:
- Last sync time
- Synced items count
- Failed items
- Target platform status

### validate

Validate configuration file.

```bash
specbridge validate
```

## Examples

```bash
# Initialize in project
cd my-project
specbridge init

# Edit .specbridge.yaml with your config

# Test sync (dry run)
specbridge sync --dry-run

# Perform actual sync
specbridge sync

# Watch for changes
specbridge watch
```
