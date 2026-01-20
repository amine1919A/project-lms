# lms_sessions/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Session, Test, TestScore
from .serializers import SessionSerializer, TestSerializer, TestScoreSerializer
from accounts.permissions import IsTeacher, IsStudent

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=['post'])
    def start_live(self, request, pk=None):
        session = self.get_object()
        if session.teacher != request.user:
            return Response({"error": "Pas autorisé"}, status=403)
        session.is_live = True
        session.save()
        return Response({"status": "live démarré", "session_id": session.id})

    @action(detail=True, methods=['post'])
    def stop_live(self, request, pk=None):
        session = self.get_object()
        session.is_live = False
        session.save()
        return Response({"status": "live terminé"})

class TestViewSet(viewsets.ModelViewSet):
    queryset = Test.objects.all()
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

class TestScoreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TestScore.objects.all()
    serializer_class = TestScoreSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def ranking(self, request):
        test_id = request.query_params.get('test_id')
        if not test_id:
            return Response({"error": "test_id requis"}, status=400)
        scores = TestScore.objects.filter(test_id=test_id).select_related('student')
        serializer = self.get_serializer(scores, many=True)
        return Response(serializer.data)