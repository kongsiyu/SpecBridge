# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-19

### Added

#### Core Infrastructure
- Unified data model for specifications (SpecData, Requirement, Task, Design)
- TaskStatus enum with four states: todo, in_progress, done, blocked
- SyncResult and SyncChange interfaces for tracking synchronization
- Custom error classes for better error handling:
  - SpecBridgeError (base class)
  - ConfigNotFoundError
  - ConfigParseError
  - AuthenticationError
  - RateLimitError
  - AdapterError

#### Configuration System
- YAML-based configuration file support (.specbridge.yaml)
- Environment variable replacement in configuration
- Configuration validation with version checking
- Support for multiple target platforms
- Notification configuration (extensible)

#### Adapter Architecture
- Source adapter interface for reading specifications
- Target adapter interface for syncing to platforms
- Base adapter classes with common functionality
- Kiro source adapter implementation:
  - Detects .kiro/specs directories
  - Parses requirements.md, design.md, tasks.md
  - Supports task status mapping ([ ], [x], [-])
  - Extracts assignee information (@username)
  - Converts to unified SpecData format
- GitHub target adapter implementation:
  - Token and gh-cli authentication support
  - Creates/updates GitHub Issues
  - Custom label support for tracking (specbridge:task-id:*)
  - Issue status management (open/close)
  - Assignee and label support
  - Sync comment functionality

#### Sync Engine
- Core synchronization orchestration
- Error isolation between targets
- Sync history tracking
- Sync status management
- Scope filtering (all, requirements, tasks, single)
- Dry-run mode support
- Multi-target parallel synchronization

#### CLI Commands
- `init`: Initialize configuration file
- `sync`: Perform one-time synchronization
- `status`: Check synchronization status
- Global options: --verbose, --version
- Scope control: --scope (all|requirements|tasks|single)
- Dry-run mode: --dry-run

#### File Utilities
- fileExists: Check file existence
- readFile/writeFile: File I/O operations
- readYaml/writeYaml: YAML file handling
- ensureDir: Directory creation with recursive support

#### Logging System
- Logger class with multiple levels (info, warn, error, success, debug)
- Color-coded output using chalk
- Spinner support using ora for long-running operations
- Verbose mode for detailed logging

#### Sync State Persistence
- .specbridge/sync-state.json for tracking synced items
- Mapping between spec IDs and platform IDs
- Automatic state file generation and updates

#### Testing
- 116 unit tests covering:
  - Core data models
  - Configuration management
  - Error handling
  - File utilities
- 20 integration tests for:
  - Sync engine coordination
  - Kiro adapter parsing
  - Multi-target synchronization
  - Error isolation
- Test specifications in .test-specs/test-feature/

#### Documentation
- Comprehensive README with quick start guide
- Architecture design documentation
- CLI usage guide
- Configuration reference
- Adapter development guide
- End-to-end testing guide
- CHANGELOG (this file)

#### Code Quality
- TypeScript strict mode enabled
- ESLint configuration with TypeScript support
- Prettier code formatting
- Explicit function return types required
- Path aliases for cleaner imports (@/*)

#### Build & Packaging
- TypeScript compilation to dist/
- Source maps for debugging
- Declaration files for type definitions
- .npmignore for clean package distribution
- LICENSE file (MIT)
- .gitignore for sensitive files

### Technical Details

#### Dependencies
- @octokit/rest: GitHub API client
- chalk: Terminal colors
- commander: CLI framework
- dotenv: Environment variable loading
- gray-matter: Markdown frontmatter parsing
- jira-client: Jira API client
- ora: Terminal spinners
- yaml: YAML parsing and serialization

#### Dev Dependencies
- TypeScript: Language and compiler
- Vitest: Testing framework
- ESLint: Code linting
- Prettier: Code formatting
- tsx: TypeScript execution
- @types/node: Node.js type definitions

### Known Limitations

- GitHub adapter requires valid token or gh-cli installation
- Bidirectional sync not yet supported
- Jira and CodeUp adapters not yet implemented
- No built-in scheduling (use cron/task scheduler)
- Single-threaded execution

### Future Roadmap

- [ ] Bidirectional synchronization
- [ ] Jira adapter implementation
- [ ] CodeUp adapter implementation
- [ ] VSCode extension
- [ ] Web dashboard for status monitoring
- [ ] Scheduled synchronization
- [ ] Webhook support for real-time sync
- [ ] Analytics and reporting
- [ ] Multi-language support

### Migration Guide

N/A - Initial release

### Contributors

- Development team

### Support

For issues, questions, or contributions, please visit:
- GitHub Issues: https://github.com/your-org/specbridge/issues
- Documentation: https://github.com/your-org/specbridge/docs

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backwards compatible manner
- PATCH version for backwards compatible bug fixes

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag: `git tag v0.1.0`
4. Push to GitHub: `git push origin v0.1.0`
5. Publish to NPM: `npm publish`
