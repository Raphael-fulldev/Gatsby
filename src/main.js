import chalk from "chalk";
import fs from "fs";
import ncp from "ncp";
import path from "path";
import { promisify } from "util";
import execa from "execa";
import Listr from "listr";
import { projectInstall } from "pkg-install";
const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false
  });
}

async function copyLockFile(options) {
  return copy(options.lockDirectory, options.targetDirectory, {
    clobber: false
  });
}

async function initGit(options) {
  const result = await execa("git", ["init"], {
    cwd: options.targetDirectory
  });
  if (result.failed) {
    return Promise.reject(new Error("Failed to initialize git"));
  }
  return;
}

export async function createGatsbyWeb(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd()
  };

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    "../../templates",
    options.template.toLowerCase(),
    "src"
  );
  let lockDir
  if (options.packageManager === 'yarn'){
    lockDir = path.resolve(
      new URL(currentFileUrl).pathname,
      "../../templates",
      options.template.toLowerCase(),
      "yarn"
    );
  } else {
    lockDir = path.resolve(
      new URL(currentFileUrl).pathname,
      "../../templates",
      options.template.toLowerCase(),
      "npm"
    );
  }
  options.templateDirectory = templateDir;
  options.lockDirectory =  lockDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error("%s Invalid template name", chalk.red.bold("ERROR"));
    process.exit(1);
  }

  const tasks = new Listr([
    {
      title: "Copy project files",
      task: () => copyTemplateFiles(options)
    },
    {
      title: "Copy lock file",
      task: () => copyLockFile(options)
    },
    {
      title: "Initialize git",
      task: () => initGit(options),
      enabled: () => options.git
    },
    {
      title: "Install dependencies",
      task: () =>
        projectInstall({
          prefer: options.packageManager,
          cwd: options.targetDirectory
        }),
      skip: () =>
        !options.runInstall
          ? "Choose y to automatically install dependencies"
          : undefined
    }
  ]);

  await tasks.run();

  console.log("%s Project ready", chalk.green.bold("DONE"));
  return true;
}
