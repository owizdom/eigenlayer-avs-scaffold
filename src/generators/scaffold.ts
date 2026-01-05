import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Handlebars from 'handlebars';

export async function scaffoldProject(projectName: string, template: string): Promise<void> {
  const projectPath = path.join(process.cwd(), projectName);
  
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory ${projectName} already exists`);
  }

  // Prompt for project details if not provided
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: projectName,
    },
    {
      type: 'list',
      name: 'template',
      message: 'Select AVS template:',
      choices: ['task-based', 'oracle'],
      default: template,
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'An EigenLayer AVS project',
    },
  ]);

  await fs.ensureDir(projectPath);
  console.log(chalk.green(`Created directory: ${answers.projectName}`));

  // Create project structure
  await createProjectStructure(projectPath, answers);
  console.log(chalk.green('Project scaffolded successfully!'));
}

async function createProjectStructure(projectPath: string, config: any): Promise<void> {
  // Create directories
  await fs.ensureDir(path.join(projectPath, 'contracts'));
  await fs.ensureDir(path.join(projectPath, 'contracts/interfaces'));
  await fs.ensureDir(path.join(projectPath, 'scripts'));
  await fs.ensureDir(path.join(projectPath, 'test'));
  await fs.ensureDir(path.join(projectPath, 'off-chain'));
  await fs.ensureDir(path.join(projectPath, 'off-chain/aggregator'));
  await fs.ensureDir(path.join(projectPath, 'off-chain/executor'));

  // Copy contract templates
  const contractsPath = path.join(__dirname, '../../contracts');
  if (await fs.pathExists(contractsPath)) {
    await fs.copy(
      path.join(contractsPath, 'interfaces'),
      path.join(projectPath, 'contracts/interfaces')
    );
    await fs.copy(
      path.join(contractsPath, 'TaskMailbox.sol'),
      path.join(projectPath, 'contracts/TaskMailbox.sol')
    );
    await fs.copy(
      path.join(contractsPath, 'TaskAVSRegistrar.sol'),
      path.join(projectPath, 'contracts/TaskAVSRegistrar.sol')
    );
    await fs.copy(
      path.join(contractsPath, 'SlashingConditions.sol'),
      path.join(projectPath, 'contracts/SlashingConditions.sol')
    );
  }

  // Generate package.json
  const packageJsonTemplate = Handlebars.compile(await fs.readFile(
    path.join(__dirname, '../templates/package.json.hbs'),
    'utf-8'
  ).catch(() => getDefaultPackageJsonTemplate()));
  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    packageJsonTemplate(config)
  );

  // Generate hardhat.config.ts
  const hardhatConfig = getHardhatConfig();
  await fs.writeFile(
    path.join(projectPath, 'hardhat.config.ts'),
    hardhatConfig
  );

  // Generate deployment script
  const deployScript = getDeployScript();
  await fs.writeFile(
    path.join(projectPath, 'scripts/deploy.ts'),
    deployScript
  );

  // Generate test file
  const testFile = getTestFile();
  await fs.writeFile(
    path.join(projectPath, 'test/TaskMailbox.test.ts'),
    testFile
  );

  // Generate off-chain components
  await generateOffChainComponents(projectPath, config);
}

async function generateOffChainComponents(projectPath: string, config: any): Promise<void> {
  // Aggregator
  const aggregatorCode = getAggregatorCode();
  await fs.writeFile(
    path.join(projectPath, 'off-chain/aggregator/index.ts'),
    aggregatorCode
  );

  // Executor
  const executorCode = getExecutorCode();
  await fs.writeFile(
    path.join(projectPath, 'off-chain/executor/index.ts'),
    executorCode
  );

  // Off-chain package.json
  const offChainPackageJson = {
    name: `${config.projectName}-off-chain`,
    version: "0.1.0",
    type: "module",
    dependencies: {
      "ethers": "^6.9.2",
      "dotenv": "^16.3.1"
    }
  };
  await fs.writeJSON(
    path.join(projectPath, 'off-chain/package.json'),
    offChainPackageJson,
    { spaces: 2 }
  );
}

function getDefaultPackageJsonTemplate(): string {
  return `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy": "hardhat run scripts/deploy.ts"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "hardhat": "^2.19.4",
    "typescript": "^5.3.3"
  }
}`;
}

function getHardhatConfig(): string {
  return `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};

export default config;
`;
}

function getDeployScript(): string {
  return `import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const TaskMailbox = await ethers.getContractFactory("TaskMailbox");
  const mailbox = await TaskMailbox.deploy();
  await mailbox.waitForDeployment();
  console.log("TaskMailbox deployed to:", await mailbox.getAddress());

  const TaskAVSRegistrar = await ethers.getContractFactory("TaskAVSRegistrar");
  const delegationManager = process.env.DELEGATION_MANAGER || ethers.ZeroAddress;
  const registrar = await TaskAVSRegistrar.deploy(
    await mailbox.getAddress(),
    delegationManager
  );
  await registrar.waitForDeployment();
  console.log("TaskAVSRegistrar deployed to:", await registrar.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;
}

function getTestFile(): string {
  return `import { expect } from "chai";
import { ethers } from "hardhat";

describe("TaskMailbox", function () {
  it("Should submit a task", async function () {
    const TaskMailbox = await ethers.getContractFactory("TaskMailbox");
    const mailbox = await TaskMailbox.deploy();
    await mailbox.waitForDeployment();

    const taskData = ethers.toUtf8Bytes("test task");
    const tx = await mailbox.submitTask(taskData);
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
  });
});
`;
}

function getAggregatorCode(): string {
  return `import { ethers } from 'ethers';

export class Aggregator {
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor(providerUrl: string, contractAddress: string, abi: any[]) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.contract = new ethers.Contract(contractAddress, abi, this.provider);
  }

  async aggregateTask(taskId: bigint): Promise<void> {
    // Implement aggregation logic
    console.log(\`Aggregating task \${taskId}\`);
  }
}
`;
}

function getExecutorCode(): string {
  return `import { ethers } from 'ethers';

export class Executor {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;

  constructor(providerUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async executeTask(taskData: string): Promise<string> {
    // Implement task execution logic
    console.log(\`Executing task: \${taskData}\`);
    return 'result';
  }
}
`;
}
