"""
RAG utilities for content chunking, embedding, and search.
Adapted from mcp-crawl4ai-rag with ChromaDB for local storage.
OPTIMIZED: Lazy loading for heavy imports to improve startup time.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse
import hashlib
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Lazy loaded globals - initialized on first use
openai_client = None
reranker = None
text_splitter = None

# Embedding cache for performance optimization
_embedding_cache: Dict[str, List[float]] = {}
_cache_stats = {"hits": 0, "misses": 0}

def _get_cache_key(text: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    """Generate cache key for embedding requests."""
    cache_content = text
    if metadata:
        # Include relevant metadata in cache key
        relevant_metadata = {k: v for k, v in metadata.items() 
                           if k in ["source_id", "content_type"]}
        if relevant_metadata:
            cache_content += json.dumps(relevant_metadata, sort_keys=True)
    
    return hashlib.sha256(cache_content.encode()).hexdigest()[:16]

def get_embedding_cache_stats() -> Dict[str, Any]:
    """Get cache performance statistics."""
    total = _cache_stats["hits"] + _cache_stats["misses"]
    hit_rate = (_cache_stats["hits"] / total * 100) if total > 0 else 0
    return {
        "hits": _cache_stats["hits"],
        "misses": _cache_stats["misses"],
        "total_requests": total,
        "hit_rate_percent": round(hit_rate, 2),
        "cache_size": len(_embedding_cache)
    }

def get_openai_client():
    """Lazy load OpenAI client."""
    global openai_client
    if openai_client is None:
        from openai import OpenAI
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return openai_client

def get_reranker():
    """Lazy load sentence transformer reranker."""
    global reranker
    if reranker is None:
        from sentence_transformers import CrossEncoder
        reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    return reranker

def get_text_splitter():
    """Lazy load LangChain text splitter."""
    global text_splitter
    if text_splitter is None:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    return text_splitter

def extract_domain(url: str) -> str:
    """Extract domain from URL for source filtering."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except Exception:
        return "unknown"

def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """Count tokens in text using tiktoken."""
    try:
        import tiktoken
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        # Fallback: rough estimation
        return int(len(text.split()) * 1.3)

def smart_chunk_content(content: str, title: str, url: str) -> List[Dict[str, Any]]:
    """
    Intelligently chunk content preserving semantic meaning.
    Enhanced with content quality filtering.
    """
    # Skip low-value content early (if filtering enabled)
    if os.getenv("USE_CONTENT_FILTERING", "true").lower() == "true":
        if should_skip_content(content, title, url):
            return []
    
    chunk_size = int(os.getenv("CHUNK_SIZE", "3000"))  # Smaller for better granularity
    chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "300"))
    
    # Use lazy-loaded text splitter with enhanced separators
    splitter = get_text_splitter()
    # Update configuration for this specific use
    splitter.chunk_size = chunk_size
    splitter.chunk_overlap = chunk_overlap
    
    # Preprocess content for better chunking
    cleaned_content = preprocess_content_for_chunking(content)
    chunks = splitter.split_text(cleaned_content)
    
    # Process chunks with quality filtering
    processed_chunks = []
    source_id = extract_domain(url)
    
    for i, chunk in enumerate(chunks):
        # Enhanced quality filtering per chunk (if filtering enabled)
        if os.getenv("USE_CONTENT_FILTERING", "true").lower() == "true":
            if not is_quality_chunk(chunk):
                continue
        
        # Add contextual information to chunk
        enhanced_chunk = enhance_chunk_with_context(chunk, title, url, i)
        
        word_count = len(enhanced_chunk.split())
        
        chunk_data = {
            "url": url,
            "title": title,
            "chunk_number": i + 1,
            "content": enhanced_chunk,
            "original_content": chunk.strip(),  # Keep original for reference
            "chunk_size": len(enhanced_chunk),
            "word_count": word_count,
            "source_id": source_id,
            "metadata": {
                "title": title,
                "source_id": source_id,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "content_type": classify_content_type(chunk),
                "quality_score": calculate_chunk_quality(chunk)
            }
        }
        
        processed_chunks.append(chunk_data)
    
    return processed_chunks

def should_skip_content(content: str, title: str, url: str) -> bool:
    """Determine if content should be skipped as low-value."""
    content_length = len(content.strip())
    
    # Skip very short content
    if content_length < 200:
        return True
    
    # Skip generic/template content
    generic_phrases = [
        "is a website", "is a social", "users can", "social news website",
        "please enable javascript", "404 not found", "page not found",
        "cookies are disabled", "sorry, this page", "under construction"
    ]
    
    content_lower = content.lower()
    generic_count = sum(1 for phrase in generic_phrases if phrase in content_lower)
    
    # If more than 2 generic phrases in short content, skip
    if content_length < 1000 and generic_count >= 2:
        return True
    
    # Skip if mostly navigation/UI elements
    ui_indicators = ["click here", "menu", "navigation", "sidebar", "footer", "header"]
    ui_count = sum(1 for indicator in ui_indicators if indicator in content_lower)
    
    # High UI-to-content ratio suggests non-content page
    if content_length < 1500 and ui_count >= 3:
        return True
    
    return False

def is_quality_chunk(chunk: str) -> bool:
    """Check if a chunk meets quality standards."""
    chunk = chunk.strip()
    
    # Minimum length
    if len(chunk) < 50:
        return False
    
    # Must have some substantial words
    words = chunk.split()
    if len(words) < 8:
        return False
    
    # Skip chunks that are mostly symbols/numbers
    alpha_ratio = sum(1 for c in chunk if c.isalpha()) / len(chunk)
    if alpha_ratio < 0.5:
        return False
    
    # Skip chunks with excessive repetition
    unique_words = set(words)
    if len(words) > 20 and len(unique_words) / len(words) < 0.3:
        return False
    
    return True

def preprocess_content_for_chunking(content: str) -> str:
    """Clean and prepare content for better chunking."""
    import re
    
    # Remove excessive whitespace
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    content = re.sub(r' +', ' ', content)
    
    # Normalize section breaks
    content = re.sub(r'={3,}', '\n\n', content)
    content = re.sub(r'-{3,}', '\n\n', content)
    
    # Ensure proper sentence endings have space
    content = re.sub(r'([.!?])([A-Z])', r'\1 \2', content)
    
    return content.strip()

def enhance_chunk_with_context(chunk: str, title: str, url: str, chunk_index: int) -> str:
    """Add contextual information to chunk for better embedding."""
    # Add title context for better semantic understanding
    domain = extract_domain(url)
    
    # Only add context if chunk doesn't already mention the title/domain
    chunk_lower = chunk.lower()
    title_lower = title.lower()
    
    context_parts = []
    
    # Add title context if not already present
    if title_lower not in chunk_lower and len(title) > 5:
        context_parts.append(f"Source: {title}")
    
    # Add domain context if valuable
    if domain != "unknown" and domain not in chunk_lower:
        context_parts.append(f"Website: {domain}")
    
    if context_parts:
        context = " | ".join(context_parts)
        return f"{context}\n\n{chunk}"
    
    return chunk

def classify_content_type(chunk: str) -> str:
    """Classify the type of content in the chunk."""
    chunk_lower = chunk.lower()
    
    if any(keyword in chunk_lower for keyword in ["price", "$", "cost", "buy", "purchase"]):
        return "commerce"
    elif any(keyword in chunk_lower for keyword in ["how to", "step", "tutorial", "guide"]):
        return "instructional"
    elif any(keyword in chunk_lower for keyword in ["news", "today", "yesterday", "breaking"]):
        return "news"
    elif any(keyword in chunk_lower for keyword in ["about us", "contact", "company", "team"]):
        return "organizational"
    else:
        return "general"

def calculate_chunk_quality(chunk: str) -> float:
    """Calculate a quality score for the chunk (0-1)."""
    score = 0.5  # Base score
    
    # Length bonus/penalty
    length = len(chunk)
    if 200 <= length <= 2000:
        score += 0.2
    elif length < 100:
        score -= 0.3
    
    # Sentence structure bonus
    sentences = chunk.count('.') + chunk.count('!') + chunk.count('?')
    if sentences >= 2:
        score += 0.15
    
    # Word variety bonus
    words = chunk.split()
    if len(words) > 10:
        unique_ratio = len(set(words)) / len(words)
        score += unique_ratio * 0.15
    
    return max(0.0, min(1.0, score))

async def create_embedding(text: str, metadata: Optional[Dict[str, Any]] = None) -> List[float]:
    """Create embedding using OpenAI API with optional contextual enhancement and caching."""
    try:
        model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        
        # Enhance text with metadata context for better embeddings
        embedding_text = text
        if metadata and os.getenv("USE_CONTEXTUAL_EMBEDDINGS", "true").lower() == "true":
            embedding_text = enhance_text_for_embedding(text, metadata)
        
        # Check cache first
        cache_key = _get_cache_key(embedding_text)
        if cache_key in _embedding_cache:
            _cache_stats["hits"] += 1
            return _embedding_cache[cache_key]
        
        _cache_stats["misses"] += 1
        
        response = get_openai_client().embeddings.create(
            model=model,
            input=embedding_text
        )
        
        # Cache the result
        embedding = response.data[0].embedding
        _embedding_cache[cache_key] = embedding
        
        # Limit cache size to prevent memory issues
        if len(_embedding_cache) > 1000:
            # Remove oldest 20% of entries (simple cache eviction)
            keys_to_remove = list(_embedding_cache.keys())[:200]
            for key in keys_to_remove:
                del _embedding_cache[key]
        
        return embedding
    except Exception as e:
        logger.error(f"Failed to create embedding: {e}")
        raise

def enhance_text_for_embedding(text: str, metadata: Dict[str, Any]) -> str:
    """Enhance text with contextual metadata for better embeddings."""
    enhancements = []
    
    # Add title context
    if "title" in metadata and metadata["title"]:
        title = metadata["title"]
        if title.lower() not in text.lower()[:200]:  # Only if not already mentioned early
            enhancements.append(f"Document title: {title}")
    
    # Add content type context
    if "content_type" in metadata:
        content_type = metadata["content_type"]
        if content_type != "general":
            enhancements.append(f"Content type: {content_type}")
    
    # Add domain context
    if "source_id" in metadata and metadata["source_id"] != "unknown":
        domain = metadata["source_id"]
        if domain not in text.lower()[:200]:
            enhancements.append(f"Source domain: {domain}")
    
    # Combine enhancements with original text
    if enhancements:
        context = " | ".join(enhancements)
        return f"{context}\n\n{text}"
    
    return text

async def add_content_chunks_to_chroma(chunks: List[Dict[str, Any]], memory_id: str) -> None:
    """Add content chunks to ChromaDB with embeddings and temporal metadata."""
    from chroma_setup import get_or_create_content_collection
    collection = get_or_create_content_collection()
    
    current_timestamp = time.time()
    current_datetime = datetime.now(timezone.utc).isoformat()
    
    # Prepare data for ChromaDB batch insert
    ids = []
    documents = []
    embeddings = []
    metadatas = []
    
    for chunk in chunks:
        try:
            # Create embedding for the enhanced chunk content
            embedding = await create_embedding(chunk["content"], chunk["metadata"])
            
            # Generate unique ID for this chunk
            chunk_id = f"{memory_id}_{chunk['chunk_number']}"
            
            # Prepare metadata with temporal information
            metadata = {
                "memory_id": memory_id,
                "url": chunk["url"],
                "title": chunk["title"],
                "chunk_number": chunk["chunk_number"],
                "chunk_size": chunk["chunk_size"],
                "word_count": chunk["word_count"],
                "source_id": chunk["source_id"],
                # Temporal metadata
                "created_timestamp": current_timestamp,
                "created_datetime": current_datetime,
                # Flatten nested metadata
                "chunk_index": chunk["metadata"]["chunk_index"],
                "total_chunks": chunk["metadata"]["total_chunks"],
                "content_type": chunk["metadata"]["content_type"],
                "quality_score": chunk["metadata"]["quality_score"],
                # Store original content in metadata for retrieval
                "original_content": chunk["original_content"]
            }
            
            ids.append(chunk_id)
            documents.append(chunk["content"])  # Enhanced content for embedding/search
            embeddings.append(embedding)
            metadatas.append(metadata)
            
        except Exception as e:
            logger.error(f"Failed to process chunk {chunk.get('chunk_number', '?')}: {e}")
            continue
    
    if ids:
        try:
            # Batch insert into ChromaDB
            collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )
        except Exception as e:
            logger.error(f"Failed to add chunks to ChromaDB: {e}")
            raise

def calculate_time_weighted_similarity(similarity: float, created_timestamp: float, decay_factor: float = 0.001) -> float:
    """
    Calculate time-weighted similarity score.
    More recent memories get higher scores.
    
    Args:
        similarity: Original similarity score (0-1)
        created_timestamp: Unix timestamp when memory was created
        decay_factor: How much to penalize older memories (default: 0.001)
    
    Returns:
        Time-weighted similarity score
    """
    current_time = time.time()
    age_in_days = (current_time - created_timestamp) / (24 * 60 * 60)
    
    # Apply exponential decay: newer memories get higher boost
    time_weight = 1.0 + (1.0 - min(1.0, age_in_days * decay_factor))
    
    return similarity * time_weight

async def search_content_chunks(
    query: str,
    source_filter: Optional[str] = None,
    limit: int = 5,
    use_contextual_embeddings: bool = False,
    time_filter_days: Optional[int] = None,
    enable_time_weighting: bool = True
) -> List[Dict[str, Any]]:
    """
    Search content chunks using vector similarity in ChromaDB with temporal awareness.
    Enhanced with contextual query embeddings and time-based filtering/weighting.
    """
    try:
        # Create enhanced query embedding
        query_metadata = {}
        if source_filter:
            query_metadata["source_id"] = source_filter
        
        # Always use contextual embeddings for search (helps with domain context)
        query_embedding = await create_embedding(query, query_metadata if source_filter else None)
        
        # Get ChromaDB collection
        from chroma_setup import get_or_create_content_collection
        collection = get_or_create_content_collection()
        
        # Prepare where clause for filtering
        where_clause = {}
        if source_filter:
            where_clause["source_id"] = source_filter
        
        # Add time-based filtering if specified
        if time_filter_days:
            cutoff_timestamp = time.time() - (time_filter_days * 24 * 60 * 60)
            where_clause["created_timestamp"] = {"$gte": cutoff_timestamp}
        
        # Search in ChromaDB with enhanced embedding
        search_limit = limit * 2 if enable_time_weighting else limit  # Get more for reranking
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=search_limit,
            where=where_clause if where_clause else None,
            include=["documents", "metadatas", "distances"]
        )
        
        # Transform ChromaDB results to our expected format
        chunks = []
        if results and results["documents"] and len(results["documents"]) > 0:
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0]
            
            for i, (doc, metadata, distance) in enumerate(zip(documents, metadatas, distances)):
                # Convert distance to similarity (ChromaDB returns distances, lower is better)
                similarity = 1.0 - distance
                
                # Apply time weighting if enabled
                if enable_time_weighting and "created_timestamp" in metadata:
                    try:
                        created_timestamp = float(metadata["created_timestamp"])
                        similarity = calculate_time_weighted_similarity(similarity, created_timestamp)
                    except (ValueError, TypeError):
                        # Fallback if timestamp is invalid
                        pass
                
                # Extract original content if available
                original_content = doc
                if "original_content" in metadata:
                    original_content = metadata["original_content"]
                
                chunk = {
                    "id": results["ids"][0][i] if "ids" in results else f"chunk_{i}",
                    "url": metadata.get("url", ""),
                    "title": metadata.get("title", ""),
                    "content": original_content,  # Return original content, not enhanced version
                    "source_id": metadata.get("source_id", ""),
                    "similarity": similarity,
                    "created_timestamp": metadata.get("created_timestamp"),
                    "created_datetime": metadata.get("created_datetime"),
                    "metadata": {
                        "memory_id": metadata.get("memory_id", ""),
                        "chunk_number": metadata.get("chunk_number", i),
                        "chunk_size": metadata.get("chunk_size", len(doc)),
                        "word_count": metadata.get("word_count", len(doc.split())),
                        "chunk_index": metadata.get("chunk_index", i),
                        "total_chunks": metadata.get("total_chunks", 1),
                        "content_type": metadata.get("content_type", "general"),
                        "quality_score": metadata.get("quality_score", 0.5)
                    }
                }
                chunks.append(chunk)
        
        # Sort by time-weighted similarity and return top results
        if enable_time_weighting:
            chunks.sort(key=lambda x: x["similarity"], reverse=True)
            chunks = chunks[:limit]
        
        return chunks
        
    except Exception as e:
        logger.error(f"Content search failed: {e}")
        return []

async def rerank_results(query: str, results: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Rerank search results using cross-encoder.
    Based on mcp-crawl4ai-rag approach.
    """
    if not os.getenv("USE_RERANKING", "true").lower() == "true":
        return results[:top_k]
    
    if len(results) <= top_k:
        return results
    
    try:
        # Use lazy-loaded reranker
        reranker = get_reranker()
        
        # Prepare query-document pairs for reranking
        pairs = [(query, result["content"]) for result in results]
        
        # Get reranking scores
        scores = reranker.predict(pairs)
        
        # Sort results by reranking scores
        scored_results = list(zip(results, scores))
        scored_results.sort(key=lambda x: x[1], reverse=True)
        
        # Return top_k results with reranking scores
        reranked_results = []
        for result, score in scored_results[:top_k]:
            result = result.copy()
            result["rerank_score"] = float(score)
            reranked_results.append(result)
        
        return reranked_results
        
    except Exception as e:
        logger.error(f"Failed to rerank results: {e}")
        return results[:top_k]

async def generate_memory_summary(content: str, title: str) -> Tuple[str, List[str]]:
    """
    Generate synopsis and tags for memory storage using LLM.
    Based on mcp-mem0 approach.
    """
    try:
        # Truncate content if too long
        max_content_length = 3000
        truncated_content = content[:max_content_length]
        if len(content) > max_content_length:
            truncated_content += "..."
        
        prompt = f"""
        Analyze this web page content and create:
        1. A concise synopsis (2-3 sentences) capturing the main purpose/value, including geographical context (country, region, language) if relevant
        2. Comprehensive tags (5-8 keywords) for categorization, including:
           - Content category (news, finance, shopping, etc.)
           - Industry/topic keywords
           - Language/country identifiers (e.g., "German", "Germany", "English", "UK", "French", "France")
           - Website type (newspaper, blog, company, etc.)
        
        IMPORTANT: If the website is from a specific country or in a specific language, include country/language identifiers in both synopsis and tags for better discoverability.
        
        Examples:
        - For Handelsblatt: Include "German", "Germany" in tags and mention "German financial newspaper" in synopsis
        - For BBC: Include "UK", "British", "English" in tags
        - For Le Monde: Include "French", "France" in tags
        
        Title: {title}
        Content: {truncated_content}
        
        Return as JSON: {{"synopsis": "...", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]}}
        """
        
        response = get_openai_client().chat.completions.create(
            model=os.getenv("LLM_CHOICE", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise summaries and tags for web content. Focus on making content easily discoverable by including geographical, language, and cultural context. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        # Parse the JSON response
        result_text = response.choices[0].message.content.strip()
        
        # Extract JSON from response (in case there's extra text)
        import re
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            result_json = json.loads(json_match.group())
            synopsis = result_json.get("synopsis", f"Website about {title}")
            tags = result_json.get("tags", [title.lower()])
            
            return synopsis, tags
        else:
            # Fallback if JSON parsing fails
            fallback_tags = [title.lower()]
            # Add some intelligent fallback tags based on title/content
            if any(term in title.lower() for term in ['handelsblatt', 'bild', 'zeit', 'spiegel']):
                fallback_tags.extend(['german', 'germany', 'news'])
            elif any(term in title.lower() for term in ['bbc', 'guardian', 'telegraph']):
                fallback_tags.extend(['uk', 'british', 'english', 'news'])
            elif any(term in title.lower() for term in ['lemonde', 'figaro', 'liberation']):
                fallback_tags.extend(['french', 'france', 'news'])
            return f"Website about {title}", fallback_tags
            
    except Exception as e:
        logger.error(f"Failed to generate memory summary: {e}")
        # Intelligent fallback based on title
        fallback_tags = [title.lower()]
        if any(term in title.lower() for term in ['handelsblatt', 'bild', 'zeit', 'spiegel']):
            fallback_tags.extend(['german', 'germany', 'news'])
            return f"German website about {title}", fallback_tags
        elif any(term in title.lower() for term in ['bbc', 'guardian', 'telegraph']):
            fallback_tags.extend(['uk', 'british', 'english', 'news'])
            return f"UK website about {title}", fallback_tags
        elif any(term in title.lower() for term in ['lemonde', 'figaro', 'liberation']):
            fallback_tags.extend(['french', 'france', 'news'])
            return f"French website about {title}", fallback_tags
        return f"Website about {title}", fallback_tags 