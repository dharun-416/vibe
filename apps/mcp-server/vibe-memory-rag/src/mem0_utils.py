"""
Mem0 utilities for memory management.
Adapted from mcp-mem0 for browser tab memory storage.
"""
import os
import logging
from typing import List, Dict, Any
from mem0 import Memory

logger = logging.getLogger(__name__)

# Global memory client
memory_client = None

def get_mem0_client() -> Memory:
    """Get configured Mem0 client."""
    global memory_client
    
    if memory_client is None:
        logger.info("Initializing Mem0 client...")
        
        # Mem0 configuration with ChromaDB (separate path to avoid conflicts)
        import os.path
        # Use absolute path to ensure consistency
        current_dir = os.path.dirname(os.path.abspath(__file__))
        default_mem0_path = os.path.join(current_dir, "..", "data", "chroma_db_mem0")
        mem0_db_path = os.getenv("MEM0_DB_PATH", default_mem0_path)
        
        config = {
            "vector_store": {
                "provider": "chroma",
                "config": {
                    "collection_name": os.getenv("MEM0_COLLECTION_NAME", "vibe_memories"),
                    "path": mem0_db_path
                }
            },
            "llm": {
                "provider": "openai",
                "config": {
                    "model": os.getenv("LLM_CHOICE", "gpt-4o-mini"),
                    "api_key": os.getenv("OPENAI_API_KEY")
                }
            },
            "embedder": {
                "provider": "openai",
                "config": {
                    "model": os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
                    "api_key": os.getenv("OPENAI_API_KEY")
                }
            }
        }
        
        memory_client = Memory.from_config(config)
        logger.info("Mem0 client initialized")
    
    return memory_client

async def add_memory(user_id: str, memory_data: Dict[str, Any]) -> Dict[str, Any]:
    """Add a generic memory to Mem0."""
    try:
        from datetime import datetime, timezone
        import time
        
        client = get_mem0_client()
        
        # Extract text from memory_data
        text = memory_data.get("text", "")
        if not text:
            raise ValueError("Memory data must contain 'text' field")
        
        # Create temporal metadata
        current_timestamp = time.time()
        current_datetime = datetime.now(timezone.utc).isoformat()
        
        # Prepare enhanced metadata
        enhanced_metadata = {
            "source": memory_data.get("source", "unknown"),
            "timestamp": memory_data.get("timestamp", current_datetime),
            # Enhanced temporal metadata
            "creation_timestamp": current_timestamp,
            "creation_datetime": current_datetime,
            "temporal_id": f"gen_{int(current_timestamp)}_{user_id}",
            "age_category": "recent",
            "content_type": "generic"
        }
        
        # Add memory to Mem0 with temporal metadata
        result = client.add(
            messages=[{"role": "user", "content": text}],
            user_id=user_id,
            metadata=enhanced_metadata
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to add memory: {e}")
        raise

async def add_browser_memory(
    url: str,
    title: str,
    synopsis: str,
    tags: List[str],
    content: str,
    user_id: str = "browser_user"
) -> str:
    """
    Add browser tab memory to Mem0.
    Returns the memory ID.
    """
    try:
        from datetime import datetime, timezone
        import time
        
        memory = get_mem0_client()
        
        # Create structured memory text with clear URL preservation
        memory_text = f"Visited: {title}\nURL: {url}\nSummary: {synopsis}\nTags: {', '.join(tags[:5])}"
        
        # Create temporal metadata for better tracking
        current_timestamp = time.time()
        current_datetime = datetime.now(timezone.utc).isoformat()
        
        # Store with infer=False to preserve exact structure AND with metadata including temporal info
        messages = [{"role": "user", "content": memory_text}]
        result = memory.add(
            messages, 
            user_id=user_id,
            infer=False,  # Preserve original text structure
            metadata={
                "url": url,
                "title": title,
                "synopsis": synopsis,
                "tags": ", ".join(tags),  # Convert list to string
                "domain": extract_domain_from_url(url),
                "content_type": "browser_tab",
                # Enhanced temporal metadata
                "creation_timestamp": current_timestamp,
                "creation_datetime": current_datetime,
                "temporal_id": f"mem_{int(current_timestamp)}_{user_id}",
                "age_category": "recent"  # Will be updated over time
            }
        )
        
        # Extract memory ID from result (handle different response formats)
        memory_id = None
        if isinstance(result, dict):
            if "memory_id" in result:
                memory_id = result["memory_id"]
            elif "id" in result:
                memory_id = result["id"]
        elif hasattr(result, 'id'):
            memory_id = result.id
        
        # Fallback: generate ID from URL and timestamp
        if not memory_id:
            memory_id = f"memory_{abs(hash(url))}_{int(current_timestamp)}"
        
        return str(memory_id)
        
    except Exception as e:
        logger.error(f"Failed to add browser memory: {e}")
        raise

async def search_browser_memories(
    query: str,
    user_id: str = "browser_user",
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    DEPRECATED: Use unified_search instead.
    Search memories using Mem0 - enhanced with metadata support.
    """
    try:
        memory = get_mem0_client()
        
        # Search memories
        results = memory.search(query=query, user_id=user_id, limit=limit)
        
        # Handle Mem0 response format
        if isinstance(results, dict) and "results" in results:
            memory_objects = results["results"]
        else:
            memory_objects = results if results else []
        
        # Convert to structured format expected by TypeScript frontend
        memories = []
        discovered_domains = set()
        
        for memory_obj in memory_objects:
            try:
                if isinstance(memory_obj, dict):
                    memory_content = memory_obj.get("memory", "")
                    
                    # Try to get info from metadata first (preferred)
                    metadata = memory_obj.get("metadata", {})
                    
                    if metadata and metadata.get("content_type") == "browser_tab":
                        # Use metadata directly (most reliable)
                        url = metadata.get("url", "Unknown")
                        title = metadata.get("title", "Untitled")
                        synopsis = metadata.get("synopsis", memory_content)
                        domain = metadata.get("domain", "Unknown")
                        
                        if domain != "Unknown":
                            discovered_domains.add(domain)
                    else:
                        # FALLBACK: Parse content for existing memories
                        # Try new structured format first: "Visited: {title}\nURL: {url}\n..."
                        if "Visited:" in memory_content and "URL:" in memory_content:
                            lines = memory_content.split('\n')
                            title = "Untitled"
                            url = "Unknown"
                            synopsis = memory_content
                            
                            for line in lines:
                                if line.startswith("Visited:"):
                                    title = line.replace("Visited:", "").strip()
                                elif line.startswith("URL:"):
                                    url = line.replace("URL:", "").strip()
                                elif line.startswith("Summary:"):
                                    synopsis = line.replace("Summary:", "").strip()
                        else:
                            # Fallback to old parsing logic for existing memories
                            url = "Unknown"
                            title = "Untitled"
                            synopsis = memory_content
                            
                            # Try to extract URL using regex
                            import re
                            url_match = re.search(r'https?://[^\s]+', memory_content)
                            if url_match:
                                url = url_match.group(0)
                            
                            # Extract title for old format
                            title_match = re.search(r'I visited\s+(.+?)\s+at\s+https?://', memory_content)
                            if title_match:
                                title = title_match.group(1).strip()
                            elif len(memory_content) > 10:
                                # Use first part of content as title
                                title = memory_content[:50] + "..."
                        
                        # Extract domain from URL
                        domain = "Unknown"
                        if url != "Unknown":
                            domain = extract_domain_from_url(url)
                            if domain != "Unknown":
                                discovered_domains.add(domain)
                    
                    memory_item = {
                        "id": memory_obj.get("id", ""),
                        "url": url,
                        "title": title,
                        "synopsis": synopsis,
                        "domain": domain,
                        "content": memory_content,  # Keep original content for reference
                        "created_at": memory_obj.get("created_at", ""),
                        "score": memory_obj.get("score", 0.0)
                    }
                    memories.append(memory_item)
                        
            except Exception as e:
                logger.error(f"Error processing search result: {e}")
                continue
        
        return memories, list(discovered_domains)
        
    except Exception as e:
        logger.error(f"Memory search failed: {e}")
        return [], []

async def get_recent_browser_memories(
    user_id: str = "browser_user",
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Get recent memories for general context.
    Enhanced to handle both structured format and metadata.
    FIXED: Now properly sorts by timestamp to return truly recent memories.
    """
    try:
        memory = get_mem0_client()
        
        # Get all memories for user
        results = memory.get_all(user_id=user_id)
        
        # Handle Mem0 response format
        if isinstance(results, dict) and "results" in results:
            memory_objects = results["results"]
        else:
            memory_objects = results if results else []
        
        # Convert to structured format AND extract timestamps for sorting
        memories_with_timestamps = []
        for memory_obj in memory_objects:
            try:
                if isinstance(memory_obj, dict):
                    memory_content = memory_obj.get("memory", "")
                    created_at = memory_obj.get("created_at", "")
                    
                    # Try to get info from metadata first (preferred)
                    metadata = memory_obj.get("metadata", {})
                    
                    if metadata and metadata.get("content_type") == "browser_tab":
                        # Use metadata directly (most reliable)
                        url = metadata.get("url", "Unknown")
                        title = metadata.get("title", "Untitled")
                        synopsis = metadata.get("synopsis", memory_content)
                        domain = metadata.get("domain", "Unknown")
                    else:
                        # FALLBACK: Parse content for existing memories
                        # Try new structured format first: "Visited: {title}\nURL: {url}\n..."
                        if "Visited:" in memory_content and "URL:" in memory_content:
                            lines = memory_content.split('\n')
                            title = "Untitled"
                            url = "Unknown"
                            synopsis = memory_content
                            
                            for line in lines:
                                if line.startswith("Visited:"):
                                    title = line.replace("Visited:", "").strip()
                                elif line.startswith("URL:"):
                                    url = line.replace("URL:", "").strip()
                                elif line.startswith("Summary:"):
                                    synopsis = line.replace("Summary:", "").strip()
                        else:
                            # Fallback to old parsing logic for existing memories
                            url = "Unknown"
                            title = "Untitled"
                            synopsis = memory_content
                            
                            # Try to extract URL using regex
                            import re
                            url_match = re.search(r'https?://[^\s]+', memory_content)
                            if url_match:
                                url = url_match.group(0)
                            
                            # Extract title for old format
                            title_match = re.search(r'I visited\s+(.+?)\s+at\s+https?://', memory_content)
                            if title_match:
                                title = title_match.group(1).strip()
                            elif len(memory_content) > 10:
                                # Use first part of content as title
                                title = memory_content[:50] + "..."
                        
                        # Extract domain from URL
                        domain = "Unknown"
                        if url != "Unknown":
                            domain = extract_domain_from_url(url)
                    
                    memory_item = {
                        "id": memory_obj.get("id", ""),
                        "url": url,
                        "title": title,
                        "synopsis": synopsis,
                        "domain": domain,
                        "content": memory_content,  # Keep original content for reference
                        "created_at": created_at,
                        "updated_at": memory_obj.get("updated_at", ""),
                        "user_id": memory_obj.get("user_id", user_id)
                    }
                    
                    # Extract timestamp for sorting
                    sort_timestamp = 0
                    if created_at:
                        try:
                            from datetime import datetime
                            if isinstance(created_at, str):
                                # Try ISO format first
                                try:
                                    sort_timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp()
                                except:
                                    # Fallback: assume it's already a timestamp string
                                    sort_timestamp = float(created_at)
                            else:
                                sort_timestamp = float(created_at)
                        except (ValueError, TypeError):
                            # If timestamp parsing fails, use metadata timestamp
                            if metadata and "creation_timestamp" in metadata:
                                try:
                                    sort_timestamp = float(metadata["creation_timestamp"])
                                except:
                                    sort_timestamp = 0
                    
                    memories_with_timestamps.append((memory_item, sort_timestamp))
                        
            except Exception as e:
                logger.error(f"Error processing memory object: {e}")
                continue
        
        # Sort by timestamp (newest first) and take only the requested limit
        memories_with_timestamps.sort(key=lambda x: x[1], reverse=True)
        sorted_memories = [memory for memory, _ in memories_with_timestamps[:limit]]
        
        return sorted_memories
        
    except Exception as e:
        logger.error(f"Failed to get recent memories: {e}")
        return []

async def delete_memory(memory_id: str, user_id: str = "browser_user") -> bool:
    """Delete a specific memory."""
    try:
        memory = get_mem0_client()
        memory.delete(memory_id=memory_id, user_id=user_id)
        return True
    except Exception as e:
        logger.error(f"Failed to delete memory {memory_id}: {e}")
        return False

async def clear_all_memories(user_id: str = "browser_user") -> bool:
    """Clear all memories for a user (use with caution)."""
    try:
        memory = get_mem0_client()
        memory.delete_all(user_id=user_id)
        logger.info(f"Cleared all memories for user: {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to clear memories for user {user_id}: {e}")
        return False

def extract_domain_from_url(url: str) -> str:
    """Extract domain from URL for source filtering."""
    from urllib.parse import urlparse
    
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except Exception:
        return "unknown" 