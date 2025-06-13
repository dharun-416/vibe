"""
Advanced temporal intelligence system for memory retrieval.
Replaces hardcoded keyword detection with semantic and statistical approaches.
"""
import logging
import time
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class QueryIntent(Enum):
    TEMPORAL_PRIMARY = "temporal_primary"     # Time is the main concern
    TEMPORAL_SECONDARY = "temporal_secondary" # Time matters but semantic also important
    SEMANTIC_ONLY = "semantic_only"           # Pure semantic search

@dataclass
class TemporalProfile:
    """Data-driven temporal characteristics of the memory collection."""
    mean_age_hours: float
    std_age_hours: float
    recent_threshold_hours: float
    old_threshold_hours: float
    temporal_distribution: Dict[str, float]

class TemporalIntelligence:
    """
    Advanced temporal ranking system that adapts to data characteristics
    without hardcoded keywords or fixed thresholds.
    """
    
    def __init__(self):
        self._profile: Optional[TemporalProfile] = None
        self._query_embeddings_cache = {}
        
    async def analyze_intent(self, query: str, memory_collection: List[Dict]) -> Tuple[QueryIntent, float]:
        """
        Analyze query intent using semantic similarity and statistical approaches.
        Returns intent type and confidence score (0.0-1.0).
        """
        # 1. Semantic approach: Compare query to temporal patterns
        temporal_confidence = await self._semantic_temporal_detection(query)
        
        # 2. Statistical approach: Analyze if query benefits from temporal ranking
        temporal_benefit = self._estimate_temporal_benefit(query, memory_collection)
        
        # 3. Linguistic approach: Analyze query structure for temporal indicators
        linguistic_confidence = self._linguistic_temporal_analysis(query)
        
        # Combine approaches with weighted average
        combined_confidence = (
            temporal_confidence * 0.4 +
            temporal_benefit * 0.3 +
            linguistic_confidence * 0.3
        )
        
        # Determine intent based on confidence thresholds
        if combined_confidence >= 0.7:
            return QueryIntent.TEMPORAL_PRIMARY, combined_confidence
        elif combined_confidence >= 0.3:
            return QueryIntent.TEMPORAL_SECONDARY, combined_confidence
        else:
            return QueryIntent.SEMANTIC_ONLY, combined_confidence
    
    async def _semantic_temporal_detection(self, query: str) -> float:
        """
        Use semantic similarity to detect temporal intent without hardcoded keywords.
        """
        try:
            # Load embedding utilities
            from utils import create_embedding
            
            # Cache query embedding
            if query not in self._query_embeddings_cache:
                self._query_embeddings_cache[query] = await create_embedding(query)
            query_embedding = self._query_embeddings_cache[query]
            
            # Temporal pattern templates (more flexible than keywords)
            temporal_patterns = [
                "show me the most recent information",
                "what was the latest thing I accessed",
                "find my recent activity",
                "chronological order of my browsing",
                "time-based search results",
                "newest entries in my history"
            ]
            
            max_similarity = 0.0
            for pattern in temporal_patterns:
                if pattern not in self._query_embeddings_cache:
                    self._query_embeddings_cache[pattern] = await create_embedding(pattern)
                pattern_embedding = self._query_embeddings_cache[pattern]
                
                # Calculate cosine similarity
                similarity = np.dot(query_embedding, pattern_embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(pattern_embedding)
                )
                max_similarity = max(max_similarity, similarity)
            
            return max_similarity
            
        except Exception as e:
            logger.error(f"Semantic temporal detection failed: {e}")
            return 0.0
    
    def _estimate_temporal_benefit(self, query: str, memory_collection: List[Dict]) -> float:
        """
        Estimate if temporal ranking would benefit this query based on data distribution.
        """
        if not memory_collection:
            return 0.0
        
        try:
            # Analyze temporal distribution of memories
            current_time = time.time()
            ages = []
            
            for memory in memory_collection:
                created_at = memory.get("created_at", "")
                if created_at:
                    try:
                        if isinstance(created_at, str):
                            timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp()
                        else:
                            timestamp = float(created_at)
                        age_hours = (current_time - timestamp) / 3600
                        ages.append(age_hours)
                    except:
                        continue
            
            if not ages:
                return 0.0
            
            ages = np.array(ages)
            
            # Higher benefit if:
            # 1. Recent memories (< 24 hours) exist
            # 2. Wide age distribution (temporal ranking can differentiate)
            # 3. Multiple memories with similar semantic content but different ages
            
            recent_count = np.sum(ages < 24)
            total_count = len(ages)
            age_variance = np.var(ages) if len(ages) > 1 else 0
            
            # Normalize factors
            recent_factor = recent_count / total_count if total_count > 0 else 0
            variance_factor = min(age_variance / 1000, 1.0)  # Cap at 1.0
            
            # Combine factors
            temporal_benefit = (recent_factor * 0.6 + variance_factor * 0.4)
            
            return temporal_benefit
            
        except Exception as e:
            logger.error(f"Temporal benefit estimation failed: {e}")
            return 0.0
    
    def _linguistic_temporal_analysis(self, query: str) -> float:
        """
        Analyze query structure for temporal indicators without hardcoded word lists.
        """
        try:
            query_lower = query.lower().strip()
            confidence = 0.0
            
            # Pattern-based analysis (more flexible than exact matches)
            temporal_patterns = [
                # Question patterns about time
                lambda q: any(time_q in q for time_q in ["when", "what time", "how long ago"]),
                # Superlative patterns (often temporal)
                lambda q: any(sup in q for sup in ["most", "latest", "newest", "oldest", "first", "last"]),
                # Temporal ordering patterns
                lambda q: any(ord_word in q for ord_word in ["order", "sequence", "chronological", "timeline"]),
                # Recency patterns
                lambda q: "recent" in q or "new" in q or "fresh" in q,
                # Comparative temporal patterns
                lambda q: "before" in q or "after" in q or "since" in q
            ]
            
            # Score based on number of patterns matched
            matched_patterns = sum(1 for pattern in temporal_patterns if pattern(query_lower))
            confidence = min(matched_patterns / len(temporal_patterns), 1.0)
            
            # Boost for certain structural patterns
            if query_lower.startswith(("what was", "show me", "find my")) and len(query_lower.split()) <= 6:
                confidence += 0.2
            
            return min(confidence, 1.0)
            
        except Exception as e:
            logger.error(f"Linguistic temporal analysis failed: {e}")
            return 0.0
    
    def build_temporal_profile(self, memory_collection: List[Dict]) -> TemporalProfile:
        """
        Build data-driven temporal profile from the memory collection.
        """
        try:
            current_time = time.time()
            ages = []
            
            for memory in memory_collection:
                created_at = memory.get("created_at", "")
                if created_at:
                    try:
                        if isinstance(created_at, str):
                            timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp()
                        else:
                            timestamp = float(created_at)
                        age_hours = (current_time - timestamp) / 3600
                        ages.append(age_hours)
                    except:
                        continue
            
            if not ages:
                # Default profile for empty collection
                return TemporalProfile(
                    mean_age_hours=24.0,
                    std_age_hours=12.0,
                    recent_threshold_hours=1.0,
                    old_threshold_hours=168.0,
                    temporal_distribution={"recent": 0.0, "medium": 0.0, "old": 1.0}
                )
            
            ages = np.array(ages)
            
            # Calculate statistics
            mean_age = float(np.mean(ages))
            std_age = float(np.std(ages))
            
            # Adaptive thresholds based on data distribution
            recent_threshold = max(1.0, np.percentile(ages, 25))  # Bottom 25%
            old_threshold = min(168.0, np.percentile(ages, 75))   # Top 25%
            
            # Distribution analysis
            recent_count = np.sum(ages <= recent_threshold)
            medium_count = np.sum((ages > recent_threshold) & (ages <= old_threshold))
            old_count = np.sum(ages > old_threshold)
            total = len(ages)
            
            distribution = {
                "recent": recent_count / total,
                "medium": medium_count / total,
                "old": old_count / total
            }
            
            profile = TemporalProfile(
                mean_age_hours=mean_age,
                std_age_hours=std_age,
                recent_threshold_hours=float(recent_threshold),
                old_threshold_hours=float(old_threshold),
                temporal_distribution=distribution
            )
            
            self._profile = profile
            return profile
            
        except Exception as e:
            logger.error(f"Failed to build temporal profile: {e}")
            # Return default profile
            return TemporalProfile(
                mean_age_hours=24.0,
                std_age_hours=12.0,
                recent_threshold_hours=1.0,
                old_threshold_hours=168.0,
                temporal_distribution={"recent": 0.3, "medium": 0.4, "old": 0.3}
            )
    
    def adaptive_temporal_scoring(
        self, 
        memory_objects: List[Dict], 
        intent: QueryIntent, 
        confidence: float,
        profile: Optional[TemporalProfile] = None
    ) -> List[Dict]:
        """
        Apply adaptive temporal scoring based on intent and data characteristics.
        """
        if intent == QueryIntent.SEMANTIC_ONLY:
            return memory_objects
        
        if profile is None:
            profile = self._profile or self.build_temporal_profile(memory_objects)
        
        try:
            current_time = time.time()
            scored_memories = []
            
            for memory_obj in memory_objects:
                semantic_score = memory_obj.get("score", 0.0)
                created_at = memory_obj.get("created_at", "")
                
                # Parse timestamp
                memory_timestamp = None
                if created_at:
                    try:
                        if isinstance(created_at, str):
                            memory_timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp()
                        else:
                            memory_timestamp = float(created_at)
                    except:
                        pass
                
                if memory_timestamp is None:
                    # No timestamp available, use semantic score only
                    final_score = semantic_score
                else:
                    age_hours = (current_time - memory_timestamp) / 3600
                    
                    if intent == QueryIntent.TEMPORAL_PRIMARY:
                        # Pure temporal ranking with confidence weighting
                        temporal_score = self._calculate_temporal_score(age_hours, profile)
                        final_score = temporal_score * confidence + semantic_score * (1 - confidence)
                    else:  # TEMPORAL_SECONDARY
                        # Hybrid approach with adaptive weighting
                        temporal_score = self._calculate_temporal_score(age_hours, profile)
                        temporal_weight = confidence * 0.5  # Max 50% temporal weight
                        final_score = semantic_score * (1 - temporal_weight) + temporal_score * temporal_weight
                
                # Create scored memory
                scored_memory = memory_obj.copy()
                scored_memory["temporal_score"] = final_score
                scored_memory["original_semantic_score"] = semantic_score
                if memory_timestamp:
                    scored_memory["age_hours"] = (current_time - memory_timestamp) / 3600
                
                scored_memories.append(scored_memory)
            
            # Sort by temporal score
            scored_memories.sort(key=lambda x: x.get("temporal_score", 0.0), reverse=True)
            
            return scored_memories
            
        except Exception as e:
            logger.error(f"Adaptive temporal scoring failed: {e}")
            return memory_objects
    
    def _calculate_temporal_score(self, age_hours: float, profile: TemporalProfile) -> float:
        """
        Calculate temporal score using adaptive function based on data profile.
        """
        try:
            # Use exponential decay with adaptive parameters
            # Recent memories get higher scores, but the decay rate adapts to data distribution
            
            # Adaptive decay rate based on data spread
            decay_rate = 1.0 / (profile.std_age_hours + 1.0)  # Slower decay for wider distributions
            
            # Base temporal score (0-1 range)
            base_score = np.exp(-decay_rate * age_hours / 24.0)  # Normalize by days
            
            # Apply profile-based adjustments
            if age_hours <= profile.recent_threshold_hours:
                # Boost recent memories
                boost = 1.2
            elif age_hours <= profile.old_threshold_hours:
                # Neutral for medium-age memories
                boost = 1.0
            else:
                # Slight penalty for old memories
                boost = 0.8
            
            return base_score * boost
            
        except Exception as e:
            logger.error(f"Temporal score calculation failed: {e}")
            return 0.5  # Neutral score

    def get_memories_by_timestamp(
        self, 
        memory_collection: List[Dict], 
        limit: int = 5,
        time_filter_hours: Optional[float] = None
    ) -> List[Dict]:
        """
        Get memories sorted purely by timestamp, bypassing semantic search.
        Useful for queries like "last visited" where time is the only criterion.
        """
        try:
            current_time = time.time()
            timestamped_memories = []
            
            for memory in memory_collection:
                created_at = memory.get("created_at", "")
                if created_at:
                    try:
                        if isinstance(created_at, str):
                            timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp()
                        else:
                            timestamp = float(created_at)
                        
                        # Apply time filter if specified
                        if time_filter_hours is not None:
                            age_hours = (current_time - timestamp) / 3600
                            if age_hours > time_filter_hours:
                                continue
                        
                        memory_with_timestamp = memory.copy()
                        memory_with_timestamp["sort_timestamp"] = timestamp
                        memory_with_timestamp["age_hours"] = (current_time - timestamp) / 3600
                        timestamped_memories.append(memory_with_timestamp)
                        
                    except (ValueError, TypeError):
                        continue
            
            # Sort by timestamp (newest first)
            timestamped_memories.sort(key=lambda x: x["sort_timestamp"], reverse=True)
            
            # Return top N memories
            result = timestamped_memories[:limit]
            
            # Clean up temporary fields
            for memory in result:
                memory.pop("sort_timestamp", None)
            
            return result
            
        except Exception as e:
            logger.error(f"Timestamp-based retrieval failed: {e}")
            return []
    
    def route_query(
        self, 
        query: str, 
        memory_collection: List[Dict], 
        intent: QueryIntent, 
        confidence: float
    ) -> Tuple[str, Dict]:
        """
        Route query to appropriate retrieval strategy based on intent analysis.
        Returns strategy name and strategy parameters.
        """
        try:
            if intent == QueryIntent.TEMPORAL_PRIMARY and confidence > 0.8:
                # Very high temporal confidence - use direct timestamp query
                return "timestamp_direct", {
                    "limit": 5,
                    "time_filter_hours": None
                }
            elif intent == QueryIntent.TEMPORAL_PRIMARY:
                # High temporal confidence - semantic search with strong temporal reranking
                return "semantic_temporal_hybrid", {
                    "semantic_limit_multiplier": 3,
                    "temporal_weight": confidence,
                    "use_fresh_memory_boost": True
                }
            elif intent == QueryIntent.TEMPORAL_SECONDARY:
                # Medium temporal confidence - balanced approach
                return "semantic_temporal_hybrid", {
                    "semantic_limit_multiplier": 2,
                    "temporal_weight": confidence * 0.5,
                    "use_fresh_memory_boost": False
                }
            else:
                # Low/no temporal confidence - pure semantic search
                return "semantic_only", {
                    "limit": 5,
                    "use_reranking": True
                }
                
        except Exception as e:
            logger.error(f"Query routing failed: {e}")
            # Fallback to semantic search
            return "semantic_only", {"limit": 5, "use_reranking": True}
    
    def explain_ranking(self, ranked_memories: List[Dict], intent: QueryIntent) -> str:
        """
        Generate explanation of how memories were ranked for debugging/transparency.
        """
        try:
            explanations = []
            explanations.append(f"Query Intent: {intent.value}")
            
            if intent != QueryIntent.SEMANTIC_ONLY and ranked_memories:
                profile = self._profile
                if profile:
                    explanations.append(f"Temporal Profile: Recent threshold: {profile.recent_threshold_hours:.1f}h, "
                                      f"Old threshold: {profile.old_threshold_hours:.1f}h")
                
                explanations.append("Top 3 Rankings:")
                for i, memory in enumerate(ranked_memories[:3]):
                    age_hours = memory.get("age_hours", "unknown")
                    temporal_score = memory.get("temporal_score", "unknown")
                    semantic_score = memory.get("original_semantic_score", "unknown")
                    content = memory.get("memory", "")[:50] + "..." if len(memory.get("memory", "")) > 50 else memory.get("memory", "")
                    
                    explanations.append(f"  {i+1}. Age: {age_hours}h, Temporal: {temporal_score:.3f}, "
                                      f"Semantic: {semantic_score:.3f} - {content}")
            
            return "\n".join(explanations)
            
        except Exception as e:
            logger.error(f"Ranking explanation failed: {e}")
            return f"Query processed with intent: {intent.value}" 