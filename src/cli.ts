#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { scaffoldProject } from './generators/scaffold';

const program = new Command();

program
  .name('avs-scaffold')
  .description('CLI tool to scaffold new AVS projects')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new AVS project')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', 'Template type (task-based, oracle)', 'task-based')
  .action(async (projectName, options) => {
    try {
      console.log(chalk.blue('Creating new AVS project...'));
      await scaffoldProject(projectName || 'my-avs', options.template);
      console.log(chalk.green('Project created successfully!'));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
