import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { AppState, Task, ActiveStory, RoadmapProject, ChatMessage } from "./src/types.js";

dotenv.config();

// Initialize Express
const app = express();
const PORT = parseInt(process.env.PORT || "5137");

app.use(express.json());

// In-memory Database state
let dbState: AppState = {
  tasks: [
    {
      id: "t1",
      title: "Revise the introductory manuscript for the Q3 Editorial",
      category: "EDITORIAL",
      status: "To Do",
      dueDate: "In 2 hours",
      description: "Ensure the tone matches the brand's 'Editorial Minimalism' and the pacing is consistent between chapters.",
      priority: "Urgent",
      pinned: true,
      assignees: [
        { name: "Elena Vance", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop" }
      ]
    },
    {
      id: "t2",
      title: "Finalize visual tokens for the new design system components",
      category: "DESIGN",
      status: "In Progress",
      dueDate: "Today, 5:00 PM",
      description: "Cross-reference with the typography scale provided by the typography review board to define leading and letter spacing.",
      priority: "High",
      progress: 60,
      pinned: true,
      assignees: [
        { name: "Julian Vane", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop" }
      ]
    },
    {
      id: "t3",
      title: "Establish core typographic hierarchy for digital surfaces",
      category: "DESIGN",
      status: "Completed",
      dueDate: "Oct 12",
      description: "Audit and standardize typography pairings across mobile and web interfaces.",
      pinned: true,
      assignees: [
        { name: "Marcus Aurel", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop" }
      ]
    },
    {
      id: "t4",
      title: "Finalize AI-prompt guidelines for internal copy-editors",
      category: "CONTENT",
      status: "To Do",
      dueDate: "Oct 15",
      description: "Establish best practices for editing workflows when using generative prompts.",
      pinned: true,
      assignees: [
        { name: "Elena Vance", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop" }
      ]
    },
    {
      id: "t5",
      title: "Beta test the automated content migration script",
      category: "ENGINEERING",
      status: "In Progress",
      dueDate: "Oct 18",
      description: "Validate script behavior on historical backups with over 10,000 articles.",
      pinned: true,
      assignees: [
        { name: "Arthur Penn", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop" }
      ]
    },
    {
      id: "t6",
      title: "Draft internal memo regarding the rebrand rollout timeline",
      category: "COMMUNICATIONS",
      status: "To Do",
      dueDate: "Tomorrow",
      description: "Outline milestones, roles, and major announcements for key stakeholders.",
      pinned: true,
      assignees: [
        { name: "Marcus Aurel", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop" }
      ]
    },
    {
      id: "t7",
      title: "Drafting September Anthology",
      category: "EDITORIAL",
      status: "To Do",
      dueDate: "Sep 12",
      description: "Coordinate with regional poets for the upcoming literary catalog.",
      assignees: [
        { name: "Marcus Aurel", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop" }
      ]
    },
    {
      id: "t8",
      title: "Typography Review: Serif Sets",
      category: "DESIGN",
      status: "In Progress",
      dueDate: "Oct 01",
      description: "Evaluate the legibility and character widths of EB Garamond across multi-density displays.",
      progress: 45,
      assignees: [
        { name: "Julian Vane", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop" },
        { name: "Elena Vance", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop" }
      ]
    },
    {
      id: "t9",
      title: "Final Polish: The Creator's Essay",
      category: "EDITORIAL",
      status: "Review",
      dueDate: "Tomorrow",
      priority: "Urgent",
      description: "Verify transition elements, logical flow, and formatting of headers.",
      assignees: []
    },
    {
      id: "t10",
      title: "Quarterly Editorial Strategy",
      category: "EDITORIAL",
      status: "In Progress",
      startDate: "2026-05-25",
      dueDate: "2026-05-28",
      description: "Formulate long-term publication roadmap and content distribution plan.",
      priority: "Urgent",
      pinned: true,
      assignees: [
        { name: "Elena Vance", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop" }
      ]
    },
    {
      id: "t11",
      title: "Anthology",
      category: "EDITORIAL",
      status: "To Do",
      startDate: "2026-05-26",
      dueDate: "2026-05-26",
      description: "Review poet submissions and align layout options.",
      priority: "High",
      pinned: true,
      assignees: [
        { name: "Julian Vane", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop" }
      ]
    },
    {
      id: "t12",
      title: "Market Analysis",
      category: "CONTENT",
      status: "Completed",
      startDate: "2026-05-27",
      dueDate: "2026-05-27",
      description: "Analyze reader demographics and engagement data.",
      priority: "Medium",
      pinned: false,
      assignees: [
        { name: "Marcus Aurel", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop" }
      ]
    }
  ],
  stories: [
    {
      id: "s1",
      title: "The Future of AI Ethics in Digital Art",
      category: "Narrative Feature",
      dueDate: "2026-05-28",
      status: "In Review",
      note: "Discuss semantic aesthetics and human contribution.",
      assigneeImages: [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop"
      ]
    },
    {
      id: "s2",
      title: "Sustainable Architecture: A Nordic Study",
      category: "Case Study",
      dueDate: "2026-05-30",
      status: "Drafting",
      note: "Review energy-saving standards in Denmark and Norway.",
      assigneeImages: [
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop"
      ]
    }
  ],
  releases: [
    {
      id: "r1",
      title: "Urban Minimalism Photobook",
      category: "Visual Arts",
      status: "PUBLISHED",
      date: "Oct 12, 2023"
    },
    {
      id: "r2",
      title: "The Psychology of Focus",
      category: "Health",
      status: "READY",
      date: "Oct 15, 2023"
    }
  ],
  roadmaps: [
    {
      id: "rm1",
      title: "Mastering Digital Textures",
      type: "PRIMARY OBJECTIVE",
      status: "Active Exploration",
      deadline: "Dec 15, 2024",
      progress: 68,
      milestones: [
        { id: "m1", title: "Visual Asset Audit Completed", completed: true },
        { id: "m2", title: "Design System Documentation V2", completed: true },
        { id: "m3", title: "Frontend Component Library Finalization", completed: false }
      ]
    },
    {
      id: "rm2",
      title: "Global Taxonomy Project",
      type: "SECONDARY OBJECTIVE",
      status: "Paused",
      deadline: "Jan 10, 2025",
      progress: 30,
      lead: "Marcus Aurel",
      milestones: [
        { id: "m4", title: "Establish standard multi-layered metadata tags", completed: true },
        { id: "m5", title: "Beta index 100 historical folders", completed: false }
      ]
    },
    {
      id: "rm3",
      title: "Q4 Market Readiness",
      type: "SECONDARY OBJECTIVE",
      status: "Active Exploration",
      deadline: "Nov 30, 2024",
      progress: 95,
      milestones: [
        { id: "m6", title: "Stress-test delivery servers", completed: true },
        { id: "m7", title: "Approve distribution channels", completed: true }
      ]
    }
  ],
  chats: [
    {
      id: "c1",
      sender: "assistant",
      text: "How can I help you today? I'm your editorial companion for drafting, analyzing, and organizing your creative workflow.",
      timestamp: "10:20 AM"
    }
  ]
};

// Lazy initialization of Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in environments. Operating in offline modes.");
      return null;
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// REST endpoints
app.get("/api/state", (req, res) => {
  res.json(dbState);
});

app.post("/api/tasks", (req, res) => {
  const newTask: Task = {
    id: "task_" + Date.now(),
    title: req.body.title || "Untitled Task",
    category: req.body.category || "General",
    status: req.body.status || "To Do",
    startDate: req.body.startDate || undefined,
    dueDate: req.body.dueDate || "No due date",
    description: req.body.description || "",
    priority: req.body.priority || "Medium",
    progress: req.body.progress || 0,
    pinned: req.body.pinned || false,
    assignees: req.body.assignees || [],
    planId: req.body.planId || undefined,
    planType: req.body.planType || undefined
  };
  dbState.tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    dbState.tasks[index] = { ...dbState.tasks[index], ...req.body };
    res.json(dbState.tasks[index]);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  dbState.tasks = dbState.tasks.filter(t => t.id !== id);
  res.sendStatus(204);
});

app.post("/api/stories", (req, res) => {
  const newStory: ActiveStory = {
    id: "story_" + Date.now(),
    title: req.body.title || "Untitled Story",
    category: req.body.category || "General Story",
    dueDate: req.body.dueDate || "No due date",
    status: req.body.status || "DRAFTING",
    assigneeImages: req.body.assigneeImages || ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop"]
  };
  dbState.stories.push(newStory);
  res.status(201).json(newStory);
});

app.put("/api/stories/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.stories.findIndex(s => s.id === id);
  if (index !== -1) {
    dbState.stories[index] = { ...dbState.stories[index], ...req.body };
    res.json(dbState.stories[index]);
  } else {
    res.status(404).json({ error: "Story not found" });
  }
});

app.put("/api/roadmaps/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.roadmaps.findIndex(r => r.id === id);
  if (index !== -1) {
    dbState.roadmaps[index] = { ...dbState.roadmaps[index], ...req.body };
    res.json(dbState.roadmaps[index]);
  } else {
    res.status(404).json({ error: "Roadmap not found" });
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message parameter is required" });
  }

  // Push user message to state
  const userMsg: ChatMessage = {
    id: "msg_" + Date.now() + "_u",
    sender: "user",
    text: message,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  dbState.chats.push(userMsg);

  try {
    const ai = getGemini();
    if (ai) {
      // Query the actual Gemini API
      console.log(`Querying Gemini with prompt: ${message}`);
      const systemInstruction = `You are the Nexus Flow AI Assistant. 
You are a highly intellectual, supportive, and helpful assistant designed for writers, researchers, and professional editors.
Keep your answers professional, elegant, and literary.
If the user asks for code, provide a high-quality example enclosed in markdown, styled beautiful inside a code block. We will render it nicely.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const responseText = response.text || "I was unable to analyze that. Let me look at your workspace structure.";

      // Parse if there is a python script or any code block to render elegantly (like word_analyzer.py in screenshot)
      let codeBlock = undefined;
      const codeRegex = /```(\w+)\s+(filename[:=]\s*([\w\-\.]+))?\n([\s\S]+?)```/;
      const match = responseText.match(codeRegex);

      // Basic extraction if matching markdown block
      let finalResponseText = responseText;
      if (match) {
        const lang = match[1];
        const fileMatch = responseText.match(/filename:\s*([\w\.\-]+)/i) || responseText.match(/filename\s*=\s*([\w\.\-]+)/i);
        const filename = fileMatch ? fileMatch[1] : `script.${lang === "python" ? "py" : "txt"}`;
        const code = match[4];
        codeBlock = { filename, language: lang, code };
        finalResponseText = responseText.replace(match[0], "").trim();
      } else {
        // Fallback checks for code markdown block without explicit filename
        const standardCodeRegex = /```(\w+)\n([\s\S]+?)```/;
        const matchStd = responseText.match(standardCodeRegex);
        if (matchStd) {
          const lang = matchStd[1];
          const code = matchStd[2];
          codeBlock = { filename: lang === 'python' ? 'word_analyzer.py' : 'code_snippet.txt', language: lang, code };
          finalResponseText = responseText.replace(matchStd[0], "").trim();
        }
      }

      const assistantMsg: ChatMessage = {
        id: "msg_" + Date.now() + "_a",
        sender: "assistant",
        text: finalResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        codeBlock
      };

      dbState.chats.push(assistantMsg);
      return res.json({ response: assistantMsg, currentChats: dbState.chats });
    } else {
      // Simulation Offline Mode
      console.log("No Gemini API connection. Simulating detailed response...");

      let replyText = "I would be happy to help you with that. Regarding your editorial structure, many successful frameworks benefit from a 'soft pivot' where deep character reflection bridges raw exposition and the first core conflict.";
      let codeBlock = undefined;

      if (message.toLowerCase().includes("analyze") || message.toLowerCase().includes("python") || message.toLowerCase().includes("chapter")) {
        replyText = "Regarding your request to analyze the pacing in your chapter, editorial structures benefit heavily from a 'soft pivot' where internal character reflection bridges the gap before external conflict. Let's look at the transition points together.\n\nFor your technical request, here is a clean Python script to analyze your character name frequencies:";
        codeBlock = {
          filename: "word_analyzer.py",
          language: "python",
          code: `import re\nfrom collections import Counter\n\ndef analyze_character_frequency(text, names):\n    \"\"\"Counts the occurrence of specific names in text.\"\"\"\n    words = re.findall(r'\\w+', text)\n    counts = Counter(word for word in words if word in names)\n    return counts\n\n# Example usage for your chapter\nnames_to_track = [\"Julian\", \"Elena\", \"Arthur\"]\nresult = analyze_character_frequency(chapter_text, names_to_track)`
        };
      } else if (message.toLowerCase().includes("task") || message.toLowerCase().includes("todo")) {
        replyText = "I have reviewed your task priorities. You currently have 4 high-priority tasks in your 'Daily Focus' list. I recommend starting with 'Revise the introductory manuscript', which is currently marked as urgent.";
      } else {
        replyText = `Thank you for reaching out in your Nexus Flow. Since we are running in offline/simulation mode, I am happy to assist you locally with structural critique or coding assistance. Your latest entry: "${message}" is successfully logged!`;
      }

      const assistantMsg: ChatMessage = {
        id: "msg_" + Date.now() + "_a",
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        codeBlock
      };
      dbState.chats.push(assistantMsg);
      setTimeout(() => {
        res.json({ response: assistantMsg, currentChats: dbState.chats });
      }, 700);
    }
  } catch (error: any) {
    console.error("Gemini route error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Reset simulation chats
app.post("/api/gemini/reset", (req, res) => {
  dbState.chats = [
    {
      id: "c1",
      sender: "assistant",
      text: "How can I help you today? I'm your editorial companion for drafting, analyzing, and organizing your creative workflow.",
      timestamp: "10:20 AM"
    }
  ];
  res.json({ chats: dbState.chats });
});

// Configure Vite or production folder serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start server:", err);
});
