import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { spawn } from "child_process"

type ExecutionResult = {
  stdout: string
  stderr: string
  exitCode: number
}

type RunOptions = {
  command: string
  args: string[]
  stdin?: string
  cwd: string
  timeoutMs?: number
}

type ExecuteCodeOptions = {
  language: string
  code: string
  stdin?: string
}

const TIMEOUT_MS = 8000

function runProcess({
  command,
  args,
  stdin = "",
  cwd,
  timeoutMs = TIMEOUT_MS,
}: RunOptions): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "pipe",
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error(`Execution timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    })

    child.on("close", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      })
    })

    if (stdin) {
      child.stdin.write(stdin)
    }
    child.stdin.end()
  })
}

function formatMissingRuntimeError(language: string, executable: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("ENOENT")) {
    return new Error(
      `Local runtime for ${language} is not installed. Expected executable: ${executable}.`
    )
  }
  return error instanceof Error ? error : new Error(message)
}

export async function executeCodeLocally({
  language,
  code,
  stdin = "",
}: ExecuteCodeOptions): Promise<ExecutionResult> {
  const normalizedLanguage = language.trim().toLowerCase()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "spec-crt-"))

  try {
    if (normalizedLanguage === "python") {
      const filename = path.join(tempDir, "main.py")
      await fs.writeFile(filename, code, "utf8")
      try {
        return await runProcess({
          command: "python",
          args: [filename],
          stdin,
          cwd: tempDir,
        })
      } catch (error) {
        throw formatMissingRuntimeError("python", "python", error)
      }
    }

    if (normalizedLanguage === "javascript") {
      const filename = path.join(tempDir, "main.js")
      await fs.writeFile(filename, code, "utf8")
      try {
        return await runProcess({
          command: "node",
          args: [filename],
          stdin,
          cwd: tempDir,
        })
      } catch (error) {
        throw formatMissingRuntimeError("javascript", "node", error)
      }
    }

    if (normalizedLanguage === "cpp") {
      const sourceFile = path.join(tempDir, "main.cpp")
      const outputFile = path.join(tempDir, process.platform === "win32" ? "main.exe" : "main")
      await fs.writeFile(sourceFile, code, "utf8")
      try {
        const compileResult = await runProcess({
          command: "g++",
          args: ["-std=c++17", sourceFile, "-o", outputFile],
          cwd: tempDir,
        })
        if (compileResult.exitCode !== 0) {
          return compileResult
        }
        return await runProcess({
          command: outputFile,
          args: [],
          stdin,
          cwd: tempDir,
        })
      } catch (error) {
        throw formatMissingRuntimeError("cpp", "g++", error)
      }
    }

    if (normalizedLanguage === "java") {
      const sourceFile = path.join(tempDir, "Main.java")
      await fs.writeFile(sourceFile, code, "utf8")
      try {
        const compileResult = await runProcess({
          command: "javac",
          args: [sourceFile],
          cwd: tempDir,
        })
        if (compileResult.exitCode !== 0) {
          return compileResult
        }
        return await runProcess({
          command: "java",
          args: ["-cp", tempDir, "Main"],
          stdin,
          cwd: tempDir,
        })
      } catch (error) {
        throw formatMissingRuntimeError("java", "javac/java", error)
      }
    }

    throw new Error(`Unsupported language for local execution: ${language}`)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
