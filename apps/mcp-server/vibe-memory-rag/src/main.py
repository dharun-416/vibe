"""
Vibe Memory + RAG MCP Server
Combines Mem0 memory notes with RAG capabilities for browser tab content.
OPTIMIZED: Lazy loading for faster startup times
"""
import os
import json
import logging
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from fastmcp import FastMCP

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO")
# Ensure log_level is a valid string
if hasattr(logging, log_level):
    level = getattr(logging, log_level)
else:
    level = logging.INFO  # Default fallback

logging.basicConfig(
    level=level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# LAZY IMPORTS: Only import when needed to reduce startup time
_utils_loaded = False
_mem0_utils_loaded = False

def load_utils():
    """Lazy load utilities to reduce startup time."""
    global _utils_loaded
    if not _utils_loaded:
        global smart_chunk_content, add_content_chunks_to_chroma, search_content_chunks, rerank_results, generate_memory_summary, get_or_create_content_collection
        from utils import (
            smart_chunk_content,
            add_content_chunks_to_chroma,
            search_content_chunks,
            rerank_results,
            generate_memory_summary
        )
        from chroma_setup import get_or_create_content_collection
        _utils_loaded = True

def load_mem0_utils():
    """Lazy load Mem0 utilities to reduce startup time."""
    global _mem0_utils_loaded
    if not _mem0_utils_loaded:
        global add_browser_memory, search_browser_memories, get_recent_browser_memories, delete_memory, clear_all_memories, get_mem0_client
        from mem0_utils import (
            add_browser_memory,
            search_browser_memories,
            get_recent_browser_memories,
            delete_memory,
            clear_all_memories,
            get_mem0_client
        )
        _mem0_utils_loaded = True

# Initialize FastMCP server
mcp = FastMCP("Vibe Memory RAG Server")

async def _process_tab_memory_background(url: str, title: str, content: str, user_id: str, memory_id: str):
    """
    Background processing for heavy operations: LLM synopsis + content chunking/embedding.
    This runs asynchronously after save_tab_memory returns.
    """
    try:
        # Load utilities (they should already be loaded, but just in case)
        load_utils()
        load_mem0_utils()
        
        # 1. Generate synopsis + tags using LLM (the slow part)
        synopsis, tags = await generate_memory_summary(content, title)
        
        # 2. Update the memory with the generated synopsis
        memory_client = get_mem0_client()
        # Update the memory with additional metadata
        try:
            # Note: Mem0 doesn't have a direct update method, so we'll add this as metadata
            # The synopsis will be included in future search results
            memory_client.add(
                [{"role": "assistant", "content": f"Synopsis: {synopsis}"}],
                user_id=user_id,
                metadata={
                    "type": "synopsis_update",
                    "memory_id": memory_id,
                    "tags": tags,
                    "url": url,
                    "title": title
                }
            )
        except Exception as e:
            logger.error(f"Failed to update synopsis: {e}")
        
        # 3. Chunk content and embed for RAG search (the very slow part)
        chunks = smart_chunk_content(content, title, url)
        await add_content_chunks_to_chroma(chunks, memory_id)
        
    except Exception as e:
        logger.error(f"Error in background processing for {memory_id}: {str(e)}")

@mcp.tool()
async def save_tab_memory(url: str, title: str, content: str, user_id: str = "browser_user") -> str:
    """
    Fast storage with background processing
    - Immediate: Basic memory storage (< 500ms)  
    - Background: LLM synopsis + content chunking/embedding
    """
    try:
        # Load utilities on first use
        load_utils()
        load_mem0_utils()
        
        # IMMEDIATE: Save basic memory without LLM synopsis (fast)
        memory_id = await add_browser_memory(
            url=url,
            title=title,
            synopsis=f"Visited: {title}",  # Simple placeholder, will be updated in background
            tags=["browser", "tab"],  # Basic tags, will be enhanced in background
            content=content[:1000],  # Store truncated content for immediate access
            user_id=user_id
        )
        
        # BACKGROUND: Schedule heavy processing (LLM + chunking + embedding)
        asyncio.create_task(_process_tab_memory_background(url, title, content, user_id, memory_id))
        
        # Return immediately while background processing continues
        result_msg = f"Saved memory: {title} (processing content in background)"
        return result_msg
        
    except Exception as e:
        error_msg = f"Error saving memory: {str(e)}"
        logger.error(error_msg)
        return error_msg

async def _unified_search_core(query: str, user_id: str = "browser_user", limit: int = 5) -> dict:
    """
    Intelligent unified search: Mem0-first with RAG fallback.
    ENHANCED: Uses advanced temporal intelligence instead of hardcoded keywords.
    """
    try:
        # Load utilities on first use
        load_utils()
        load_mem0_utils()
        
        # Validate query
        if not query or not query.strip():
            query = "recent memories"  # Fallback for empty queries
        
        logger.info(f"[UNIFIED SEARCH DEBUG] Starting search for query: '{query}'")
        
        # Get initial memory collection for analysis
        memory_client = get_mem0_client()
        
        # Get a larger initial set for temporal analysis
        initial_search_limit = limit * 4
        logger.info(f"[UNIFIED SEARCH DEBUG] Initial Mem0 search with limit: {initial_search_limit}")
        
        mem0_results = memory_client.search(query=query, user_id=user_id, limit=initial_search_limit)
        
        # Handle Mem0 response format
        if isinstance(mem0_results, dict) and "results" in mem0_results:
            memory_objects = mem0_results["results"]
        else:
            memory_objects = mem0_results if mem0_results else []
        
        logger.info(f"[UNIFIED SEARCH DEBUG] Mem0 returned {len(memory_objects)} memories")
        
        # Initialize temporal intelligence system
        from temporal_intelligence import TemporalIntelligence, QueryIntent
        temporal_system = TemporalIntelligence()
        
        # Analyze query intent using the new system
        intent, confidence = await temporal_system.analyze_intent(query, memory_objects)
        logger.info(f"[UNIFIED SEARCH DEBUG] Intent: {intent.value}, Confidence: {confidence:.3f}")
        
        # Route query to appropriate strategy
        strategy, strategy_params = temporal_system.route_query(query, memory_objects, intent, confidence)
        logger.info(f"[UNIFIED SEARCH DEBUG] Using strategy: {strategy} with params: {strategy_params}")
        
        # Execute strategy
        if strategy == "timestamp_direct":
            # Pure timestamp-based retrieval for highest temporal confidence
            all_memories = memory_client.get_all(user_id=user_id)
            if isinstance(all_memories, dict) and "results" in all_memories:
                all_memory_objects = all_memories["results"]
            else:
                all_memory_objects = all_memories if all_memories else []
            
            final_memories = temporal_system.get_memories_by_timestamp(
                memory_collection=all_memory_objects,
                limit=limit,
                time_filter_hours=strategy_params.get("time_filter_hours")
            )
            
        elif strategy == "semantic_temporal_hybrid":
            # Enhanced search with fresh memory boost if needed
            if strategy_params.get("use_fresh_memory_boost", False):
                try:
                    fresh_memories = memory_client.get_all(user_id=user_id)
                    if isinstance(fresh_memories, dict) and "results" in fresh_memories:
                        fresh_memory_objects = fresh_memories["results"]
                    else:
                        fresh_memory_objects = fresh_memories if fresh_memories else []
                    
                    # Add fresh memories not in search results
                    fresh_memory_ids = {mem.get("id") for mem in memory_objects}
                    added_fresh = 0
                    for fresh_memory in fresh_memory_objects[:10]:
                        if fresh_memory.get("id") not in fresh_memory_ids:
                            memory_objects.append(fresh_memory)
                            added_fresh += 1
                    
                    logger.info(f"[UNIFIED SEARCH DEBUG] Added {added_fresh} fresh memories")
                    
                except Exception as e:
                    logger.error(f"[UNIFIED SEARCH DEBUG] Error getting fresh memories: {e}")
            
            # Apply temporal scoring
            final_memories = temporal_system.adaptive_temporal_scoring(
                memory_objects=memory_objects,
                intent=intent,
                confidence=confidence
            )
            
            # Take top results
            final_memories = final_memories[:limit]
            
        else:  # semantic_only
            # Pure semantic search (original behavior for non-temporal queries)
            final_memories = memory_objects[:limit]
        
        # Group memories by domain for ChromaDB enrichment
        domain_groups = {}
        memories_without_url = []
        
        for idx, memory_obj in enumerate(final_memories):
            memory_content = memory_obj.get("memory", "")
            memory_id = memory_obj.get("id", "")
            score = memory_obj.get("temporal_score", memory_obj.get("score", 0.0))
            created_at = memory_obj.get("created_at", "")
            
            # Create base result
            result = {
                "id": memory_id,
                "memory_summary": memory_content,
                "score": score,
                "created_at": created_at,
                "source": "mem0",
                "detailed_content": [],
                "ranking_method": strategy,
                "intent_confidence": confidence
            }
            
            # Extract URL and group by domain
            url = None
            if "http" in memory_content:
                import re
                url_match = re.search(r'https?://[^\s]+', memory_content)
                if url_match:
                    url = url_match.group(0)
            
            if url:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc.lower()
                if domain.startswith('www.'):
                    domain = domain[4:]
                
                result["source_url"] = url
                result["source_domain"] = domain
                
                # Group by domain
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(result)
            else:
                memories_without_url.append(result)
        
        # ChromaDB enrichment (unchanged from original)
        domain_search_results = {}
        
        for domain, domain_memories in domain_groups.items():
            try:
                detailed_chunks = await search_content_chunks(
                    query=query,
                    source_filter=domain,
                    limit=3 * len(domain_memories),
                    use_contextual_embeddings=False
                )
                
                if detailed_chunks:
                    reranked_chunks = await rerank_results(query, detailed_chunks, top_k=3 * len(domain_memories))
                    domain_search_results[domain] = reranked_chunks
                    
            except Exception as e:
                logger.error(f"Error searching domain {domain}: {e}")
                continue
        
        # Distribute chunks to memories and build final results
        enriched_results = []
        total_domains_searched = len(domain_groups)
        total_memories_enriched = 0
        
        enriched_results.extend(memories_without_url)
        
        for domain, domain_memories in domain_groups.items():
            chunks_for_domain = domain_search_results.get(domain, [])
            chunks_per_memory = len(chunks_for_domain) // len(domain_memories) if chunks_for_domain else 0
            
            for i, memory in enumerate(domain_memories):
                if chunks_for_domain:
                    start_idx = i * chunks_per_memory
                    end_idx = start_idx + min(chunks_per_memory, 3)
                    memory["detailed_content"] = chunks_for_domain[start_idx:end_idx]
                    total_memories_enriched += 1
                
                enriched_results.append(memory)
        
        # Generate ranking explanation for debugging
        ranking_explanation = temporal_system.explain_ranking(final_memories, intent)
        logger.info(f"[UNIFIED SEARCH DEBUG] Ranking explanation:\n{ranking_explanation}")
        
        final_result = {
            "type": "unified_search",
            "query": query,
            "results": enriched_results,
            "total_memories": len(memory_objects),
            "enriched_results": total_memories_enriched,
            "domains_searched": total_domains_searched,
            "temporal_intelligence": {
                "intent": intent.value,
                "confidence": confidence,
                "strategy": strategy,
                "explanation": ranking_explanation
            }
        }
        
        return final_result
        
    except Exception as e:
        error_msg = f"Error in unified search: {str(e)}"
        logger.error(error_msg)
        return {"error": error_msg}

@mcp.tool()
async def unified_search(query: str, user_id: str = "browser_user", limit: int = 5) -> str:
    """
    Intelligent unified search with temporal awareness: Mem0-first with RAG fallback.
    BEST for temporal queries like "what did I visit last", "recent websites", "latest pages".
    Automatically detects temporal intent and applies chronological ranking when needed.
    Lets Mem0 decide what's relevant, then enriches with detailed content from ChromaDB.
    """
    result = await _unified_search_core(query, user_id, limit)
    return json.dumps(result, ensure_ascii=False)

@mcp.tool()
async def search_memories(query: str, user_id: str = "browser_user", limit: int = 5) -> str:
    """
    DEPRECATED: Use unified_search instead.
    Discover relevant websites using Mem0 semantic search.
    Returns memory notes with discovered domains for content filtering.
    """
    logger.warning("search_memories is deprecated, use unified_search instead")
    return await unified_search(query, user_id, limit)

@mcp.tool()
async def search_content(
    query: str, 
    source_filter: str | None = None, 
    user_id: str = "browser_user", 
    limit: int = 5
) -> str:
    """
    RAG search within specific page content.
    Uses source_filter (domain) from previous memory discovery.
    """
    try:
        # Load utilities on first use
        load_utils()
        
        # Use advanced RAG search from mcp-crawl4ai-rag
        results = await search_content_chunks(
            query=query,
            source_filter=source_filter,
            limit=limit * 2,  # Get more for reranking
            use_contextual_embeddings=False
        )
        
        # Rerank results using cross-encoder
        reranked_results = await rerank_results(query, results, top_k=limit)
        
        
        result = {
            "type": "content_search",
            "query": query,
            "source_filter": source_filter,
            "content_chunks": reranked_results
        }
        
        return json.dumps(result, ensure_ascii=False)
        
    except Exception as e:
        error_msg = f"Error searching content: {str(e)}"
        logger.error(error_msg)
        return json.dumps({"error": error_msg})

@mcp.tool()
async def delete_tab_memory(memory_id: str, user_id: str = "browser_user") -> str:
    """Delete a specific memory and its associated content chunks."""
    try:
        # Load utilities on first use
        load_mem0_utils()
        
        # Delete from Mem0
        mem0_success = await delete_memory(memory_id, user_id)
        
        # Delete associated content chunks from ChromaDB
        from chroma_setup import get_or_create_content_collection
        collection = get_or_create_content_collection()
        
        # Get all chunks with this memory_id to count them
        try:
            # ChromaDB doesn't have a direct way to get count, so we query first
            chunk_results = collection.get(where={"memory_id": memory_id})
            chunk_count = len(chunk_results["ids"]) if chunk_results and "ids" in chunk_results else 0
            
            # Delete chunks with this memory_id
            if chunk_count > 0:
                collection.delete(where={"memory_id": memory_id})
        except Exception as delete_error:
            logger.error(f"Failed to delete chunks from ChromaDB: {delete_error}")
            chunk_count = 0
        
        if mem0_success:
            return f"Successfully deleted memory {memory_id} and {chunk_count} content chunks"
        else:
            return f"Failed to delete memory {memory_id}"
            
    except Exception as e:
        error_msg = f"Error deleting memory: {str(e)}"
        logger.error(error_msg)
        return error_msg

@mcp.tool()
async def save_conversation_memory(information: str, user_id: str = "browser_user") -> str:
    """
    Save important personal information from conversations to memory.
    OPTIMIZED: Fast storage for simple personal info to avoid Mem0 processing delays.
    
    Args:
        information (str): The personal information to save (e.g., "User's name is John", "User likes coffee")
        user_id (str, optional): User identifier. Defaults to "browser_user".
    
    Returns:
        str: JSON response with success status and message
    """
    try:
        # Load utilities on first use
        load_mem0_utils()
        
        # Detect if this is simple personal information that doesn't need Mem0's expensive intelligence
        simple_info_keywords = ['name', 'age', 'location', 'preference', 'like', 'dislike', 'born', 'live', 'work']
        is_simple_info = any(keyword in information.lower() for keyword in simple_info_keywords)
        
        if is_simple_info:
            # Fast path: Store simple personal info without expensive Mem0 processing
            memory_client = get_mem0_client()
            
            # Create temporal metadata for better tracking
            import time
            current_timestamp = time.time()
            
            # Use minimal processing for speed
            result = memory_client.add(
                [{"role": "user", "content": information}],
                user_id=user_id,
                infer=False,  # Skip expensive inference to avoid 16-second delays
                metadata={
                    "type": "personal_info",
                    "fast_store": True,
                    "timestamp": datetime.utcnow().isoformat(),
                    # Enhanced temporal metadata for consistency
                    "creation_timestamp": current_timestamp,
                    "temporal_id": f"conv_{int(current_timestamp)}_{user_id}",
                    "age_category": "recent",
                    "content_type": "conversation"
                }
            )
            
            return json.dumps({
                "success": True,
                "message": f"Quickly saved personal info: {information}",
                "fast_path": True
            }, ensure_ascii=False)
        
        else:
            # Full path: Use complete Mem0 intelligence for complex information
            from mem0_utils import add_memory
            
            memory_result = await add_memory(
                user_id=user_id,
                memory_data={
                    "text": information,
                    "source": "conversation",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            return json.dumps({
                "success": True,
                "memory_id": memory_result.get("id") if memory_result else None,
                "message": f"Saved conversation memory: {information}",
                "fast_path": False
            }, ensure_ascii=False)
        
    except Exception as e:
        error_msg = f"Failed to save conversation memory: {str(e)}"
        logger.error(error_msg)
        return json.dumps({"error": error_msg})

@mcp.tool()
async def clear_all_tab_memories(user_id: str = "browser_user") -> str:
    """Clear all memories for a user (use with caution)."""
    try:
        # Load utilities on first use
        load_mem0_utils()
        
        logger.warning(f"Clearing ALL memories for user: {user_id}")
        
        # Clear from Mem0
        mem0_success = await clear_all_memories(user_id)
        
        # Note: ChromaDB content chunks are not user-specific in our current design
        # They are linked to memories via memory_id, so when memories are cleared,
        # the chunks become orphaned but can still be searched
        logger.warning("Content chunks in ChromaDB are not cleared automatically - they are linked by memory_id")
        
        if mem0_success:
            return f"Successfully cleared all memories for user {user_id} (content chunks remain in ChromaDB)"
        else:
            return f"Failed to clear memories for user {user_id}"
            
    except Exception as e:
        error_msg = f"Error clearing memories: {str(e)}"
        logger.error(error_msg)
        return error_msg


@mcp.tool()
async def get_memory_stats(user_id: str = "browser_user") -> str:
    """Get statistics about stored memories and content chunks."""
    try:
        # Load utilities on first use
        load_mem0_utils()
        load_utils()
        
        # Get memory count from recent memories (limited way to check)
        memories = await get_recent_browser_memories(user_id=user_id, limit=1000)
        memory_count = len(memories)
        
        # Get content chunks count from ChromaDB
        from chroma_setup import get_or_create_content_collection
        collection = get_or_create_content_collection()
        
        chunks_count = collection.count()
        
        # Get unique domains from ChromaDB
        try:
            all_chunks = collection.get(include=["metadatas"])
            unique_domains = set()
            if all_chunks and "metadatas" in all_chunks:
                for metadata in all_chunks["metadatas"]:
                    if "source_id" in metadata:
                        unique_domains.add(metadata["source_id"])
            unique_domains_count = len(unique_domains)
        except Exception as e:
            logger.error(f"Failed to get unique domains: {e}")
            unique_domains_count = 0
        
        # Get embedding cache stats
        from utils import get_embedding_cache_stats
        cache_stats = get_embedding_cache_stats()
        
        result = {
            "user_id": user_id,
            "memory_count": memory_count,
            "content_chunks_count": chunks_count,
            "unique_domains": unique_domains_count,
            "storage_type": "Mem0 + ChromaDB",
            "embedding_cache": cache_stats
        }
        
        return json.dumps(result, ensure_ascii=False)
        
    except Exception as e:
        error_msg = f"Error getting memory stats: {str(e)}"
        logger.error(error_msg)
        return json.dumps({"error": error_msg})

# Server health check (FAST - no heavy dependency loading)
@mcp.tool()
async def health_check() -> str:
    """
    Lightweight health check - verifies server is responsive without loading heavy dependencies.
    OPTIMIZED: Only loads dependencies if health check is explicitly requested with diagnostics.
    """
    try:
        health_status = {
            "server": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "MCP server is running and responsive",
            "fast_check": True
        }
        
        # Basic connectivity check - only test if environment variables are present
        dependencies = {}
        
        if os.getenv("OPENAI_API_KEY"):
            dependencies["openai_key"] = "configured"
        else:
            dependencies["openai_key"] = "missing"
            
        dependencies["python_env"] = "running"
        dependencies["fastmcp"] = "loaded"
        
        health_status["dependencies"] = dependencies
        
        return json.dumps(health_status, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({"server": "unhealthy", "error": str(e)})

@mcp.tool()
async def deep_health_check() -> str:
    """
    Comprehensive health check that loads and tests all dependencies.
    Use this for detailed diagnostics when needed.
    """
    try:
        # Load utilities for comprehensive testing
        load_utils()
        load_mem0_utils()
        
        health_status = {
            "server": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "dependencies": {}
        }
        
        # Check Mem0
        try:
            mem0_client = get_mem0_client()
            health_status["dependencies"]["mem0"] = "connected"
        except Exception as e:
            health_status["dependencies"]["mem0"] = f"error: {str(e)}"
        
        # Check ChromaDB
        try:
            from chroma_setup import get_or_create_content_collection
            collection = get_or_create_content_collection()
            collection.count()  # Simple test to verify connection
            health_status["dependencies"]["chromadb"] = "connected"
        except Exception as e:
            health_status["dependencies"]["chromadb"] = f"error: {str(e)}"
        
        # Check OpenAI
        try:
            from utils import get_openai_client
            # Simple test - get available models
            models = get_openai_client().models.list()
            health_status["dependencies"]["openai"] = "connected"
        except Exception as e:
            health_status["dependencies"]["openai"] = f"error: {str(e)}"
        
        return json.dumps(health_status, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({"server": "unhealthy", "error": str(e)})

@mcp.tool()
async def get_last_visited_pages(user_id: str = "browser_user", limit: int = 5) -> str:
    """
    Get the most recently visited pages in chronological order.
    Bypasses semantic search entirely - pure timestamp-based retrieval.
    Perfect for queries like "last page I visited", "what did I just see", etc.
    """
    try:
        load_mem0_utils()
        
        # Get all memories directly
        memory_client = get_mem0_client()
        all_memories = memory_client.get_all(user_id=user_id)
        
        # Handle Mem0 response format
        if isinstance(all_memories, dict) and "results" in all_memories:
            memory_objects = all_memories["results"]
        else:
            memory_objects = all_memories if all_memories else []
        
        # Use temporal intelligence for pure timestamp retrieval
        from temporal_intelligence import TemporalIntelligence
        temporal_system = TemporalIntelligence()
        
        # Get memories sorted by timestamp only
        recent_memories = temporal_system.get_memories_by_timestamp(
            memory_collection=memory_objects,
            limit=limit
        )
        
        # Format results
        results = []
        for i, memory in enumerate(recent_memories):
            memory_content = memory.get("memory", "")
            
            # Extract structured information
            url = "Unknown"
            title = "Untitled"
            
            # Try to extract from structured format
            if "URL:" in memory_content:
                lines = memory_content.split('\n')
                for line in lines:
                    if line.startswith("Visited:"):
                        title = line.replace("Visited:", "").strip()
                    elif line.startswith("URL:"):
                        url = line.replace("URL:", "").strip()
            else:
                # Fallback parsing
                import re
                url_match = re.search(r'https?://[^\s]+', memory_content)
                if url_match:
                    url = url_match.group(0)
                if len(memory_content) > 10:
                    title = memory_content[:100] + "..." if len(memory_content) > 100 else memory_content
            
            result = {
                "rank": i + 1,
                "title": title,
                "url": url,
                "memory_content": memory_content,
                "created_at": memory.get("created_at", ""),
                "age_hours": memory.get("age_hours", 0)
            }
            results.append(result)
        
        final_result = {
            "type": "timestamp_direct",
            "method": "chronological_order",
            "total_found": len(results),
            "results": results
        }
        
        return json.dumps(final_result, ensure_ascii=False)
        
    except Exception as e:
        error_msg = f"Error getting last visited pages: {str(e)}"
        logger.error(error_msg)
        return json.dumps({"error": error_msg})

async def cleanup_on_shutdown():
    """Graceful cleanup on server shutdown."""
    try:
        logger.info("Performing graceful shutdown cleanup...")
        
        # Close any open database connections
        if _utils_loaded:
            try:
                from chroma_setup import get_or_create_content_collection
                # ChromaDB connections are managed automatically, but we can explicitly close
                logger.debug("ChromaDB connections cleaned up")
            except Exception as e:
                logger.warning(f"Error during ChromaDB cleanup: {e}")
        
        if _mem0_utils_loaded:
            try:
                # Mem0 client cleanup if needed
                logger.debug("Mem0 client cleaned up")
            except Exception as e:
                logger.warning(f"Error during Mem0 cleanup: {e}")
                
        logger.info("Shutdown cleanup completed")
    except Exception as e:
        logger.error(f"Error during shutdown cleanup: {e}")

if __name__ == "__main__":
    import signal
    import sys
    
    # Server configuration
    port = int(os.getenv("MCP_SERVER_PORT", 8052))
    
    logger.info("Starting Vibe Memory + RAG MCP Server...")
    logger.info(f"Server will run on port {port}")
    
    # Validate essential environment variables for faster startup feedback
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not found - some features will be disabled")
    
    # Set up graceful shutdown handlers
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        asyncio.create_task(cleanup_on_shutdown())
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Run the server with SSE transport for AI SDK compatibility
        mcp.run("sse", port=port)
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
        asyncio.run(cleanup_on_shutdown())
    except Exception as e:
        logger.error(f"Server error: {e}")
        asyncio.run(cleanup_on_shutdown())
        raise 