# backend/middleware.py - Middleware pour déboguer CORS
import logging

logger = logging.getLogger(__name__)

class DebugCORSMiddleware:
    """Middleware pour déboguer les requêtes CORS"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log les requêtes
        logger.debug(f"🌐 Request: {request.method} {request.path}")
        logger.debug(f"Origin: {request.META.get('HTTP_ORIGIN', 'N/A')}")
        logger.debug(f"Headers: {dict(request.META)}")
        
        response = self.get_response(request)
        
        # Log les headers de réponse
        logger.debug(f"Response status: {response.status_code}")
        logger.debug(f"CORS Headers: {response.get('Access-Control-Allow-Origin', 'NOT SET')}")
        
        return response