"""Re-export SemanticMatcher from semantic_matcher for backwards compatibility."""

from src.services.plagiarism.semantic_matcher import SemanticMatcher, semantic_matcher

__all__ = ["SemanticMatcher", "semantic_matcher"]
