"""
ChromaDB setup for local vector storage.
Replaces PostgreSQL/Supabase with local ChromaDB collections.
"""
import os
import chromadb
from chromadb.config import Settings
import logging

logger = logging.getLogger(__name__)

# Global client cache to prevent multiple instances
_chroma_client = None

def get_chroma_client():
    """Get configured ChromaDB client with persistent storage (singleton)."""
    global _chroma_client
    
    if _chroma_client is not None:
        return _chroma_client
    
    # Content chunks use separate path from Mem0 to avoid conflicts
    db_path = os.getenv("CHROMA_DB_PATH", "./data/chroma_db")
    
    # Ensure directory exists
    os.makedirs(db_path, exist_ok=True)
    
    # Create ChromaDB client with persistent storage
    _chroma_client = chromadb.PersistentClient(
        path=db_path,
        settings=Settings(
            anonymized_telemetry=False,
            allow_reset=True
        )
    )
    
    return _chroma_client

def get_or_create_content_collection():
    """Get or create the content chunks collection."""
    client = get_chroma_client()
    collection_name = os.getenv("CHROMA_COLLECTION_NAME", "vibe_content_chunks")
    
    try:
        # Try to get existing collection
        collection = client.get_collection(name=collection_name)
    except Exception:
        # Create new collection if it doesn't exist
        collection = client.create_collection(
            name=collection_name,
            metadata={
                "description": "vibe browser tab content chunks for RAG",
                "created_by": "vibe-memory-rag"
            }
        )
    
    return collection

def setup_database():
    """Initialize ChromaDB and create necessary collections."""
    try:
        # Test ChromaDB connection and create collection
        collection = get_or_create_content_collection()
        
        # Get collection info
        count = collection.count()
        logger.info(f"ChromaDB setup complete. Collection has {count} documents.")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to setup ChromaDB: {e}")
        return False

def reset_chroma_client():
    """Reset the global ChromaDB client cache."""
    global _chroma_client
    _chroma_client = None

def reset_database():
    """Reset ChromaDB collections (use with caution)."""
    try:
        # Reset client cache first
        reset_chroma_client()
        
        client = get_chroma_client()
        collection_name = os.getenv("CHROMA_COLLECTION_NAME", "vibe_content_chunks")
        
        # Delete existing collection
        try:
            client.delete_collection(name=collection_name)
        except Exception:
            pass
        
        # Recreate collection
        collection = get_or_create_content_collection()
        logger.info("ChromaDB reset complete")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to reset ChromaDB: {e}")
        return False

if __name__ == "__main__":
    # Test setup
    logging.basicConfig(level=logging.INFO)
    
    print("Setting up ChromaDB...")
    if setup_database():
        print("✅ ChromaDB setup successful!")
    else:
        print("❌ ChromaDB setup failed!") 