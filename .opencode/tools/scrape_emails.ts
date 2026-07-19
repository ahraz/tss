import { tool } from "@opencode-ai/plugin"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"

const exec = promisify(execFile)

export default tool({
  description: "Scrape a URL for email addresses using crawl4ai. Crawls the page and optionally follows contact/about links for deeper extraction.",
  args: {
    url: tool.schema.string().describe("The URL to scrape for emails"),
    deep: tool.schema.boolean().default(false).describe("Follow contact/about links for deeper extraction"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, "scripts", "email_scraper.py")
    const pythonArgs = [script, "--single-url", args.url]
    if (args.deep) pythonArgs.push("--deep")

    try {
      const { stdout } = await exec("python3", pythonArgs, {
        cwd: context.worktree,
        timeout: 30000,
      })
      const result = stdout.trim()
      return result || "No emails found"
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
})
