# eigenlayer-avs-scaffold

A CLI tool to scaffold new Autonomous Verifiable Service (AVS) projects for EigenLayer with smart contracts and off-chain components.

## What is this?

This tool helps developers quickly bootstrap new AVS projects by generating boilerplate code including:
- Solidity smart contracts (TaskMailbox, TaskAVSRegistrar, SlashingConditions)
- Off-chain components (Aggregator, Executor)
- Hardhat configuration and deployment scripts
- Test setup and examples

## Installation

```bash
npm install
npm run build
```

## Usage

### Create a new AVS project

```bash
npm run dev create my-avs-project
```

Or with options:

```bash
npm run dev create my-avs-project --template task-based
```

Available templates:
- `task-based` - Task-based AVS template (default)
- `oracle` - Oracle AVS template

The tool will prompt you for project details and generate a complete project structure.

## Project Structure

The generated project includes:
- `contracts/` - Solidity smart contracts
- `scripts/` - Deployment scripts
- `test/` - Test files
- `off-chain/` - Off-chain components (Aggregator, Executor)

## Development

```bash
# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT

