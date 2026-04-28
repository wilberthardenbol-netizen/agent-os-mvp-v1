# Agent OS — AI Agent Operating System (Local MVP)

## 1. What is this?

Agent OS is a local web app that runs 5 AI agents in sequence to research and stress-test any idea you give it. You submit an idea, the agents analyse it from multiple angles, you review their verdict at a human approval gate, and then a final agent (Forge) produces a ready-to-use Claude Code prompt you can use to implement the idea. Everything runs on your laptop — no cloud databases, no external services beyond the Anthropic API.

## 2. What you need installed

- **Node.js 20 or newer** — download from [nodejs.org](https://nodejs.org) (choose the "LTS" version). That's it.

## 3. Setup (copy-paste these commands one by one)

```bash
# Step 1: Copy the example environment file
cp .env.example .env
```

Now open the `.env` file in any text editor and:
1. Replace `sk-ant-...` with your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
2. Replace `change-me` with a password you'll use to log in

```bash
# Step 2: Install all dependencies (~1-2 minutes)
npm install

# Step 3: Set up the database and add the example data
npm run setup

# Step 4: Start the app
npm run dev
```

## 4. Open the app

Go to **http://localhost:3000** in your browser and log in with the password you set in `.env`.

## 5. How to use it

**Running the pipeline on the example task:**
1. Click **Tasks** in the sidebar — you'll see the example task already there
2. Click **New Idea** and submit a description (or use the example task as inspiration)
3. Click **Submit** — the page redirects to the task detail and the pipeline starts automatically

**Watching the pipeline run:**
- The task detail page refreshes every 2 seconds while agents are running
- You'll see each agent appear in the **Agent Timeline** as it finishes
- The whole pipeline (Maestro → Quinn → Raven → Atlas) takes about 1–3 minutes

**Approving at the human gate:**
- When Atlas finishes, the task status changes to **Awaiting Approval**
- Review the **Agent Decisions** panel on the right
- Click **Approve — Run Forge** to have Forge build the final prompt, or **Reject** to stop

**Copying Forge's prompt:**
- Once the task reaches **Done**, Forge's output appears in a dark code block
- Click **Copy prompt** and paste it into Claude Code to implement the idea

## 6. How to edit an agent's behavior

1. Click **Agents** in the sidebar
2. Find the agent you want to change
3. Click **Edit Prompt**
4. Edit the system prompt text and click **Save**

Changes take effect immediately on the next pipeline run.

## 7. Where your data lives

All your tasks, decisions, and audit logs are stored in a single file: **`prisma/dev.db`**

Back this file up regularly if you want to keep your history. You can copy it to a USB drive or cloud storage. To restore it, just put it back in the `prisma/` folder.

## 8. Common problems and fixes

**"Error: ANTHROPIC_API_KEY is not set"**
→ Open `.env` and make sure `ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE` is correct. No spaces around the `=`.

**"Port 3000 is already in use"**
→ Another app is using that port. Either stop it, or run `npm run dev -- -p 3001` to use port 3001.

**Agent failed with "JSON parse error"**
→ The pipeline retries once automatically. If it keeps failing, click **Retry** on the task detail page. If it happens repeatedly, try editing the agent's system prompt from the Agents page.

**"Cannot find module @prisma/client"**
→ Run `npm install` and then `npm run db:push` again.

**The app shows a white screen or crashes**
→ Check the terminal where `npm run dev` is running for error messages.

**I forgot my password**
→ Open `.env`, change `APP_PASSWORD`, and restart the dev server with Ctrl+C then `npm run dev`.

**"No tasks showing up after seed"**
→ Make sure you ran `npm run setup` (which runs both `db:push` and `db:seed`). If you only ran `db:push`, the agents and example task weren't inserted.

## 9. What is NOT in this version (by design)

- **No live trading or real-money actions** — this app only produces research and a Claude Code prompt. It never connects to any brokerage or exchange.
- **No MT5 or broker integrations** — purely a research and prompt-engineering tool.
- **No multi-user accounts** — single password, single user. This is a personal local tool.
- **No cloud sync** — everything stays on your laptop.
- **No automatic code execution** — Forge produces a prompt you paste into Claude Code yourself; nothing runs automatically.
