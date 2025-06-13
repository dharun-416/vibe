# Vibe Memory + RAG MCP Server

A Model Context Protocol (MCP) server that combines **Mem0 memory notes** with **advanced RAG capabilities** for browser tab content storage and retrieval.

## Features

### 🧠 **Dual Storage System**
- **Memory Notes**: LLM-generated summaries for site discovery ("remind me of that flight site")
- **Content Chunks**: Full text embeddings for detailed Q&A ("what were the 5 best deals")

### 🔍 **Intelligent Query Routing** 
- **Discovery queries** → Search memory notes → Return websites with domains
- **Content queries** → Search content chunks with domain filtering → Return detailed info
- **Smart classification** based on query keywords and conversation context

### ⚡ **Advanced RAG Features**
- Smart content chunking with semantic preservation
- Vector similarity search with OpenAI embeddings
- Cross-encoder reranking for improved relevance
- Hybrid search (vector + keyword) support
- Domain-based content filtering

## Quick Start

### 1. **Environment Setup**

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
OPENAI_API_KEY=your_openai_api_key_here

# Local database path (will be created automatically)
CHROMA_DB_PATH=./data/chroma_db
```

### 2. **Database Setup**

ChromaDB will be set up automatically when you first run the server:

```bash
# Test ChromaDB setup (optional)
python src/chroma_setup.py
```

### 3. **Install Dependencies**

```bash
# Install Python dependencies
pip install -e .

# Or using uv (recommended)
uv pip install -e .
```

### 4. **Run the Server**

```bash
# Start the MCP server
python src/main.py

# Server will start on http://localhost:8052
```

## MCP Tools

### 🏗️ **save_tab_memory**
Saves browser tab content as both memory note and searchable chunks.

```json
{
  "url": "https://kayak.com/flights/paris",
  "title": "Paris Christmas Flights",
  "content": "Full page content...",
  "user_id": "browser_user"
}
```

### 🔍 **search_memories**
Discovers relevant websites using Mem0 semantic search.

### 🎯 **search_content**
RAG search within specific page content using domain filtering.

### 📊 **get_recent_memories**
Gets recent memories for general context.

### 🗑️ **delete_tab_memory**
Deletes specific memory and associated content chunks.

### 📈 **get_memory_stats**
Returns statistics about stored memories and content chunks.

### 🏥 **health_check**
Checks server health and dependency status.

## Architecture

### **Perfect Data Flow**
```
Save: Cmd+Option+M → Agent.saveTabMemory() → MCP Server
      └── Saves memory note (synopsis) + content chunks (full text)

Discovery: "remind me of flight site" → search_memories → Memory notes + domains
Content: "what were the 5 best deals" → search_content(filter=kayak.com) → Detailed chunks
```

### **Storage Components**
- **Mem0**: Structured memory notes with metadata
- **ChromaDB**: Local vector embeddings for content chunks  
- **OpenAI**: Embeddings and LLM for summaries
- **Cross-encoder**: Result reranking for relevance

## Configuration

### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_PORT` | Server port | `8052` |
| `CHROMA_DB_PATH` | Local ChromaDB path | `./data/chroma_db` |
| `CHROMA_COLLECTION_NAME` | ChromaDB collection name | `vibe_content_chunks` |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `LLM_CHOICE` | LLM model for summaries | `gpt-4o-mini` |
| `EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` |
| `USE_RERANKING` | Enable result reranking | `true` |
| `CHUNK_SIZE` | Content chunk size | `5000` |
| `CHUNK_OVERLAP` | Chunk overlap | `500` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Benefits of Local ChromaDB

### ✅ **Privacy & Performance**
- **Local storage**: All data stays on your machine
- **No external dependencies**: Works offline
- **Fast access**: No network latency
- **Cost effective**: No database hosting fees

### ✅ **Simple Setup**
- **Auto-initialization**: ChromaDB creates collections automatically
- **No configuration**: Just set the data path
- **Portable**: Entire database is just a folder
- **Version control friendly**: Can backup/restore easily

## Troubleshooting

### **Common Issues**

1. **ChromaDB Import Error**: Install with `pip install chromadb>=0.4.0`
2. **Permission Errors**: Ensure write access to `CHROMA_DB_PATH` directory
3. **Memory Errors**: Check Mem0 configuration and dependencies
4. **Performance**: Adjust chunk size and enable reranking

### **Data Location**

Your data is stored locally in:
- **ChromaDB**: `./data/chroma_db/` (or your configured path)
- **Mem0**: Inside ChromaDB collections (separate from content chunks)

## License

MIT License - see LICENSE file for details.