import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import {
  Container, Card, CardContent, Typography, Button, Box,
  Grid, Chip, Paper, Divider, TextField,
  Alert, CircularProgress, InputAdornment, LinearProgress
} from '@mui/material';
import {
  ArrowBack, Save, DoneAll, Timer, Person, School,
  CheckCircle, Cancel, Help, Edit, Description, Refresh,
  Visibility, VisibilityOff, BugReport, Assessment
} from "@mui/icons-material";

export default function GradeStudentTest() {
  const { testId, studentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [grades, setGrades] = useState({});
  const [comments, setComments] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [error, setError] = useState(null);
  const [originalSubmission, setOriginalSubmission] = useState(null);
  const [isAutoGrading, setIsAutoGrading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [studentQuizAnswers, setStudentQuizAnswers] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    loadStudentData();
  }, [testId, studentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      
      console.log(`📡 Chargement pour test: ${testId}, étudiant: ${studentId}`);
      
      // Étape 1: Charger les données de base du test
      setLoadingProgress(10);
      console.log(`📤 Tentative: GET /tests/quizzes/${testId}/`);
      
      try {
        const testResponse = await api.get(`/tests/quizzes/${testId}/`);
        console.log("✅ Réponse test:", testResponse.data);
        
        if (testResponse.data?.success) {
          setTestData(testResponse.data.quiz || testResponse.data);
        } else {
          // Si l'API retourne success: false mais pas d'erreur
          console.warn("⚠️ API retourne success: false", testResponse.data);
        }
      } catch (testError) {
        console.error("❌ Erreur chargement test:", testError);
        // Ne pas bloquer pour une erreur de test
      }
      
      // Étape 2: Charger les questions du test
      setLoadingProgress(30);
      try {
        const questionsResponse = await api.get(`/tests/quizzes/${testId}/questions/`);
        console.log("✅ Questions:", questionsResponse.data);
        
        if (questionsResponse.data?.success && Array.isArray(questionsResponse.data.questions)) {
          setQuizQuestions(questionsResponse.data.questions);
          console.log(`📝 ${questionsResponse.data.questions.length} questions chargées`);
        }
      } catch (questionsError) {
        console.warn("⚠️ Erreur chargement questions:", questionsError);
      }
      
      // Étape 3: Essayer d'abord l'endpoint de test pour diagnostiquer
      setLoadingProgress(50);
      console.log("🔍 Test de diagnostic API...");
      
      try {
        const testDebug = await api.get(`/tests/quizzes/${testId}/students/${studentId}/test-responses/`);
        console.log("✅ Debug API:", testDebug.data);
        
        if (testDebug.data?.success) {
          setDebugInfo(testDebug.data.debug_data);
          
          // Vérifier les données disponibles
          const debugData = testDebug.data.debug_data;
          console.log("📊 Données disponibles:", {
            quiz_exists: debugData.quiz_exists,
            student_exists: debugData.student_exists,
            questions_count: debugData.stats?.questions_count,
            answers_count: debugData.stats?.student_answers_count,
            results_count: debugData.stats?.quiz_results_count
          });
          
          if (debugData.stats?.student_answers_count === 0) {
            toast.warning("L'étudiant n'a pas encore répondu à ce test");
          }
        }
      } catch (debugError) {
        console.warn("⚠️ Endpoint debug non disponible:", debugError.message);
      }
      
      // Étape 4: Charger les vraies réponses de l'étudiant
      setLoadingProgress(70);
      console.log(`📤 Chargement réponses: GET /tests/quizzes/${testId}/students/${studentId}/responses/`);
      
      try {
        const answersResponse = await api.get(`/tests/quizzes/${testId}/students/${studentId}/responses/`);
        console.log("📦 Réponses API complète:", answersResponse.data);
        setApiResponse(answersResponse.data);
        
        if (answersResponse.data?.success) {
          await processRealData(answersResponse.data);
          setLoadingProgress(100);
          return; // Succès !
        } else {
          console.warn("⚠️ API retourne success: false", answersResponse.data);
        }
      } catch (answersError) {
        console.error("❌ Erreur chargement réponses:", answersError);
        
        // Afficher l'erreur détaillée
        if (answersError.response) {
          console.error("📋 Détails erreur:", {
            status: answersError.response.status,
            data: answersError.response.data,
            headers: answersError.response.headers
          });
        }
      }
      
      // Étape 5: Si les réponses échouent, essayer l'approche robuste
      setLoadingProgress(80);
      console.log("🔄 Tentative approche robuste...");
      
      try {
        await loadWithRobustApproach();
        setLoadingProgress(100);
        toast.success("Données chargées avec l'approche robuste");
      } catch (robustError) {
        console.error("❌ Approche robuste échouée:", robustError);
        
        // Dernière tentative: créer des données minimales
        setLoadingProgress(90);
        await createMinimalData();
        setLoadingProgress(100);
        toast.warning("Mode démo activé - Données minimales");
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement globale:', error);
      setError(`Erreur de chargement: ${error.message || 'Erreur inconnue'}`);
      toast.error(`Erreur: ${error.message || 'Impossible de charger les données'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Nouvelle fonction pour créer des données minimales
  const createMinimalData = async () => {
    // Créer des données minimales pour démo
    const mockQuestions = [
      { id: 1, text: "Question 1 de démonstration", marks: 10, question_type: 'mcq', order: 1 },
      { id: 2, text: "Question 2 de démonstration", marks: 15, question_type: 'essay', order: 2 }
    ];
    
    setQuizQuestions(mockQuestions);
    
    const initialGrades = {};
    const initialComments = {};
    
    mockQuestions.forEach(q => {
      initialGrades[q.id] = 0;
      initialComments[q.id] = "";
    });
    
    setGrades(initialGrades);
    setComments(initialComments);
    setTotalScore(0);
    
    setStudentData({
      full_name: `Étudiant ${studentId}`,
      email: 'exemple@email.com',
      class: 'Classe de test'
    });
    
    setOriginalSubmission({
      is_graded: false,
      submitted_at: null
    });
  };

  const loadWithRobustApproach = async (testResponse, questionsResponse) => {
    try {
      console.log("🔄 Utilisation de l'approche robuste");
      
      // 1. Récupérer toutes les données disponibles
      const allData = await Promise.allSettled([
        api.get(`/tests/student-answers/?quiz=${testId}&student=${studentId}`),
        api.get(`/accounts/users/${studentId}/`),
        api.get(`/tests/quizzes/${testId}/results/`)
      ]);
      
      const [answersResult, studentResult, resultsResult] = allData;
      
      // 2. Initialiser les questions
      const questionsList = questionsResponse.data?.questions || [];
      setQuizQuestions(questionsList);
      
      // 3. Initialiser les notes et commentaires
      const initialGrades = {};
      const initialComments = {};
      let initialTotal = 0;
      
      // 4. Traiter les réponses si disponibles
      if (answersResult.status === 'fulfilled' && answersResult.value.data?.success) {
        const answers = answersResult.value.data.answers || [];
        setStudentQuizAnswers(answers);
        
        questionsList.forEach(q => {
          const answer = answers.find(a => a.question_id === q.id || a.id === q.id);
          if (answer) {
            initialGrades[q.id] = answer.marks_obtained || 0;
            initialComments[q.id] = answer.comment || "";
            initialTotal += answer.marks_obtained || 0;
          } else {
            initialGrades[q.id] = 0;
            initialComments[q.id] = "";
          }
        });
      } else {
        // Pas de réponses, initialiser à zéro
        questionsList.forEach(q => {
          initialGrades[q.id] = 0;
          initialComments[q.id] = "";
        });
      }
      
      // 5. Récupérer les données de l'étudiant
      if (studentResult.status === 'fulfilled' && studentResult.value.data?.success) {
        setStudentData({
          full_name: studentResult.value.data.user.full_name,
          email: studentResult.value.data.user.email,
          class: studentResult.value.data.user.class_name || 'Non assigné'
        });
      } else {
        // Données par défaut
        setStudentData({
          full_name: `Étudiant ${studentId}`,
          email: 'email@example.com',
          class: 'Classe non spécifiée'
        });
      }
      
      // 6. Récupérer les résultats du quiz
      if (resultsResult.status === 'fulfilled' && resultsResult.value.data?.success) {
        const results = resultsResult.value.data.results || [];
        const studentResult = results.find(r => r.student_id == studentId);
        
        if (studentResult) {
          setOriginalSubmission({
            is_graded: studentResult.is_graded || false,
            submitted_at: studentResult.submitted_at,
            score: studentResult.score
          });
          initialTotal = studentResult.score || initialTotal;
        }
      }
      
      // 7. Mettre à jour l'état
      setGrades(initialGrades);
      setComments(initialComments);
      setTotalScore(initialTotal);
      
      toast.success("Données chargées avec l'approche robuste");
      
    } catch (error) {
      console.error("Erreur approche robuste:", error);
      throw error;
    }
  };

  const processRealData = async (responseData, questionsResponse) => {
    try {
      console.log("✅ Traitement des données réelles");
      
      if (responseData.questions) {
        setStudentQuizAnswers(responseData.questions);
        
        // Initialiser les notes et commentaires
        const initialGrades = {};
        const initialComments = {};
        let initialTotal = 0;
        
        // Utiliser les questions de la réponse ou des questions chargées séparément
        const questionsToUse = responseData.questions.length > 0 ? 
          responseData.questions : 
          (questionsResponse.data?.questions || []);
        
        questionsToUse.forEach(q => {
          if (q.student_answer) {
            initialGrades[q.id] = q.student_answer.marks_obtained || 0;
            initialComments[q.id] = q.student_answer.comment || "";
            initialTotal += q.student_answer.marks_obtained || 0;
          } else {
            initialGrades[q.id] = 0;
            initialComments[q.id] = "";
          }
        });
        
        setGrades(initialGrades);
        setComments(initialComments);
        setTotalScore(initialTotal);
      }
      
      // Mettre à jour studentData
      if (responseData.student) {
        setStudentData({
          full_name: responseData.student.full_name,
          email: responseData.student.email,
          class: responseData.student.class_name || 'Non assigné'
        });
      }
      
      // Mettre à jour la soumission originale
      if (responseData.result) {
        setOriginalSubmission({
          is_graded: responseData.result.is_graded,
          submitted_at: responseData.result.submitted_at,
          score: responseData.result.score
        });
      }
      
      toast.success(`Réponses chargées pour ${responseData.student?.full_name || 'l\'étudiant'}`);
      
    } catch (error) {
      console.error("Erreur traitement données:", error);
      throw error;
    }
  };

  const forceLoadWithAlternativeApproach = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      
      console.log("🔄 Forçage du chargement avec approche alternative");
      
      // 1. Charger les questions
      setLoadingProgress(30);
      const questionsResponse = await api.get(`/tests/quizzes/${testId}/questions/`);
      if (questionsResponse.data?.success && Array.isArray(questionsResponse.data.questions)) {
        setQuizQuestions(questionsResponse.data.questions);
      }
      
      // 2. Essayer différents endpoints
      setLoadingProgress(60);
      const endpointsToTry = [
        `/tests/student-answers/?quiz=${testId}&student=${studentId}`,
        `/tests/quizzes/${testId}/students/${studentId}/responses/`,
        `/api/tests/quizzes/${testId}/students/${studentId}/responses/`
      ];
      
      let answersData = null;
      
      for (const endpoint of endpointsToTry) {
        try {
          console.log(`Tentative avec endpoint: ${endpoint}`);
          const response = await api.get(endpoint);
          if (response.data?.success) {
            answersData = response.data;
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} échoué:`, err.message);
        }
      }
      
      // 3. Traiter les données
      setLoadingProgress(80);
      if (answersData) {
        await processRealData(answersData, questionsResponse);
      } else {
        // Créer des données minimales
        const questionsList = questionsResponse.data?.questions || [];
        setQuizQuestions(questionsList);
        
        const initialGrades = {};
        const initialComments = {};
        
        questionsList.forEach(q => {
          initialGrades[q.id] = 0;
          initialComments[q.id] = "";
        });
        
        setGrades(initialGrades);
        setComments(initialComments);
        setTotalScore(0);
        
        setStudentData({
          full_name: `Étudiant ${studentId}`,
          email: 'email@example.com',
          class: 'Classe test'
        });
        
        toast.info("Données minimales chargées (mode démo)");
      }
      
      setLoadingProgress(100);
      toast.success("Données alternatives chargées avec succès");
      
    } catch (error) {
      console.error('❌ Erreur forçage:', error);
      setError('Erreur forçage: ' + error.message);
      toast.error('Erreur lors du chargement alternatif');
    } finally {
      setLoading(false);
    }
  };

  const runDebugTest = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tests/quizzes/${testId}/students/${studentId}/test-responses/`);
      
      if (response.data?.success) {
        setDebugInfo(response.data.debug_data);
        setShowDebug(true);
        
        // Afficher un résumé
        const debugData = response.data.debug_data;
        console.log("📊 Résumé debug:", {
          quiz_exists: debugData.quiz_exists,
          student_exists: debugData.student_exists,
          questions_count: debugData.stats?.questions_count,
          answers_count: debugData.stats?.student_answers_count,
          results_count: debugData.stats?.quiz_results_count
        });
        
        toast.success("Test de debug exécuté");
      }
    } catch (error) {
      console.error("Erreur debug test:", error);
      toast.error("Échec du test de debug");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrading = async () => {
    try {
      setLoading(true);
      
      const gradingData = {
        grades: grades,
        comments: comments,
        auto_grade: false,
        finalize: false
      };
      
      console.log("📤 Envoi des notes:", gradingData);
      
      const response = await api.post(
        `/tests/quizzes/${testId}/students/${studentId}/grade/`,
        gradingData
      );
      
      if (response.data?.success) {
        toast.success('✅ Notes sauvegardées avec succès');
        setTotalScore(response.data.result?.score || totalScore);
        await loadStudentData();
      } else {
        throw new Error(response.data?.error || "Erreur sauvegarde");
      }
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast.error('Erreur sauvegarde: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (window.confirm('Finaliser la notation ? L\'étudiant pourra voir ses notes.')) {
      try {
        setLoading(true);
        
        const response = await api.post(
          `/tests/quizzes/${testId}/students/${studentId}/grade/`,
          {
            grades: grades,
            comments: comments,
            auto_grade: false,
            finalize: true
          }
        );
        
        if (response.data?.success) {
          toast.success('✅ Notation finalisée !');
          navigate(`/teacher/tests/${testId}/grade`);
        }
        
      } catch (error) {
        console.error('Erreur finalisation:', error);
        toast.error('Erreur: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAutoGradeMCQ = (questionId) => {
    setIsAutoGrading(true);
    
    try {
      const question = quizQuestions.find(q => q.id === questionId);
      if (!question || question.question_type !== 'mcq') return;
      
      let score = 0;
      const correctChoices = question.choices?.filter(c => c.is_correct) || [];
      const selectedChoices = question.choices?.filter(c => c.is_selected) || [];
      
      if (selectedChoices.length > 0 && correctChoices.length > 0) {
        const correctSelected = selectedChoices.filter(c => c.is_correct).length;
        const incorrectSelected = selectedChoices.filter(c => !c.is_correct).length;
        
        if (incorrectSelected === 0 && correctSelected === correctChoices.length) {
          score = question.marks;
        } else if (correctSelected > 0) {
          score = (correctSelected / correctChoices.length) * question.marks * 0.8;
        }
      }
      
      score = Math.round(score * 2) / 2;
      
      setGrades(prev => ({ ...prev, [questionId]: score }));
      
      const newTotal = Object.entries({...grades, [questionId]: score})
        .reduce((sum, [qId, grade]) => {
          const q = quizQuestions.find(q => q.id == qId);
          return sum + (grade || 0);
        }, 0);
      setTotalScore(newTotal);
      
      toast.info(`Auto-correction: ${score}/${question.marks}`);
      
    } catch (error) {
      toast.error('Erreur auto-correction: ' + error.message);
    } finally {
      setIsAutoGrading(false);
    }
  };

  const handleGradeChange = (questionId, value) => {
    const numValue = parseFloat(value) || 0;
    const question = quizQuestions.find(q => q.id === questionId);
    
    if (!question) return;
    
    let finalValue = numValue;
    if (numValue > question.marks) {
      toast.warning(`Maximum: ${question.marks} points`);
      finalValue = question.marks;
    }
    
    setGrades(prev => ({
      ...prev,
      [questionId]: finalValue
    }));
    
    const newTotal = Object.entries({...grades, [questionId]: finalValue})
      .reduce((sum, [qId, grade]) => {
        const q = quizQuestions.find(q => q.id == qId);
        return sum + (grade || 0);
      }, 0);
    setTotalScore(newTotal);
  };

  const handleCommentChange = (questionId, value) => {
    setComments(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const reloadPage = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
            Chargement des réponses...
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ width: '50%', mb: 2 }}
          />
          <Typography variant="body2" color="textSecondary">
            {loadingProgress}% - Test: {testId}, Étudiant: {studentId}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Erreur de chargement
          </Typography>
          {error}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              L'API retourne peut-être une réponse de test. Essayez une approche alternative.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                onClick={forceLoadWithAlternativeApproach}
                startIcon={<Refresh />}
              >
                Forcer avec approche alternative
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={runDebugTest}
                startIcon={<BugReport />}
              >
                Exécuter test de debug
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={reloadPage}
                startIcon={<Refresh />}
              >
                Recharger la page
              </Button>
            </Box>
          </Box>
        </Alert>
        
        {/* Section de debug */}
        {debugInfo && (
          <Card sx={{ mt: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                🐛 Informations de Debug
              </Typography>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '12px'
              }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/teacher/tests/${testId}/grade`)}
        >
          Retour aux copies
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Barre de progression */}
      {loadingProgress > 0 && loadingProgress < 100 && (
        <LinearProgress 
          variant="determinate" 
          value={loadingProgress} 
          sx={{ mb: 2 }}
        />
      )}
      
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/teacher/tests/${testId}/grade`)}
          sx={{ mb: 2 }}
        >
          Retour aux copies
        </Button>
        
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" fontWeight="600">
              📝 Notation - {studentData?.full_name || `Étudiant ${studentId}`}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {testData?.title || 'Test'}
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip 
                label={originalSubmission?.is_graded ? 'Déjà corrigé' : 'À corriger'} 
                color={originalSubmission?.is_graded ? 'success' : 'warning'} 
                size="small" 
              />
              {originalSubmission?.submitted_at && (
                <Chip 
                  label={`Soumis: ${new Date(originalSubmission.submitted_at).toLocaleDateString('fr-FR')}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <Chip 
                label={`${quizQuestions.length} questions`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
              <Typography variant="h5" color="primary" fontWeight="600">
                Total: {totalScore.toFixed(1)} / {testData?.total_marks || 100} points
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Pourcentage: {testData?.total_marks ? ((totalScore / testData.total_marks) * 100).toFixed(1) : 0}%
              </Typography>
              <Chip 
                label={totalScore >= (testData?.passing_marks || 50) ? 'Réussi' : 'Échoué'} 
                color={totalScore >= (testData?.passing_marks || 50) ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Informations de l'étudiant */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <Person color="primary" />
                <Box>
                  <Typography variant="body2" color="textSecondary">Étudiant</Typography>
                  <Typography variant="h6">
                    {studentData?.full_name || `Étudiant ${studentId}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {studentData?.email || 'Email non disponible'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <School color="primary" />
                <Box>
                  <Typography variant="body2" color="textSecondary">Classe</Typography>
                  <Typography variant="h6">
                    {studentData?.class || 'Non assigné'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <Timer color="primary" />
                <Box>
                  <Typography variant="body2" color="textSecondary">Statut</Typography>
                  <Typography variant="h6">
                    {originalSubmission?.is_graded ? 'Corrigé' : 'À corriger'}
                  </Typography>
                  {originalSubmission?.submitted_at && (
                    <Typography variant="caption" color="textSecondary">
                      Soumis le: {new Date(originalSubmission.submitted_at).toLocaleDateString('fr-FR')}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions et notation */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Questions ({quizQuestions.length})
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={runDebugTest}
              startIcon={<BugReport />}
            >
              Debug
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={reloadPage}
              startIcon={<Refresh />}
            >
              Actualiser
            </Button>
          </Box>
        </Box>
        
        {quizQuestions.length === 0 ? (
          <Alert severity="warning">
            Aucune question trouvée pour ce test.
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={forceLoadWithAlternativeApproach}
              >
                Forcer avec approche alternative
              </Button>
            </Box>
          </Alert>
        ) : (
          quizQuestions.map((question, index) => {
            // Trouver la réponse de l'étudiant pour cette question
            const studentAnswer = studentQuizAnswers.find(a => a.id === question.id);
            
            return (
              <Card key={question.id} sx={{ mb: 3, borderLeft: question.question_type === 'mcq' ? '4px solid #1976d2' : '4px solid #4caf50' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6">
                        Question {index + 1}
                        {question.question_type === 'mcq' && (
                          <Chip 
                            label="MCQ" 
                            size="small" 
                            sx={{ ml: 1, fontSize: '0.7rem' }}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {question.question_type === 'mcq' ? 'Choix multiple' : 
                         question.question_type === 'essay' ? 'Dissertation' : 
                         question.question_type === 'short_answer' ? 'Réponse courte' :
                         question.question_type === 'true_false' ? 'Vrai/Faux' :
                         question.question_type === 'fill_blank' ? 'Remplir les blancs' : 'Question'} 
                        • {question.marks} points
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                      <TextField
                        size="small"
                        type="number"
                        label="Note"
                        value={grades[question.id] || 0}
                        onChange={(e) => handleGradeChange(question.id, e.target.value)}
                        InputProps={{
                          inputProps: { 
                            min: 0, 
                            max: question.marks, 
                            step: 0.5,
                            style: { textAlign: 'center' }
                          }
                        }}
                        sx={{ width: 100 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        / {question.marks}
                      </Typography>
                      {question.question_type === 'mcq' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAutoGradeMCQ(question.id)}
                          disabled={isAutoGrading}
                          sx={{ minWidth: '80px' }}
                        >
                          {isAutoGrading ? 'Calcul...' : 'Auto-correction'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                  
                  <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                      {question.text}
                    </Typography>
                  </Paper>
                  
                  {question.correct_answer && (
                    <Box sx={{ mb: 2, p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="success.main" gutterBottom>
                        ✅ Bonne réponse:
                      </Typography>
                      <Typography variant="body2">
                        {question.correct_answer}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      📝 Réponse de l'étudiant
                    </Typography>
                    
                    {question.question_type === 'mcq' && question.choices ? (
                      <Box>
                        {question.choices.map((choice) => (
                          <Box key={choice.id} display="flex" alignItems="center" gap={1} mb={1}>
                            {choice.is_selected ? (
                              choice.is_correct ? (
                                <CheckCircle color="success" fontSize="small" />
                              ) : (
                                <Cancel color="error" fontSize="small" />
                              )
                            ) : (
                              <Help color="disabled" fontSize="small" />
                            )}
                            <Typography
                              variant="body1"
                              sx={{
                                color: choice.is_selected ? 
                                  (choice.is_correct ? 'success.main' : 'error.main') : 'text.primary',
                                fontWeight: choice.is_selected ? 'bold' : 'normal',
                                backgroundColor: choice.is_selected ? 
                                  (choice.is_correct ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)') : 'transparent',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                flex: 1
                              }}
                            >
                              {choice.text}
                              {choice.is_correct && !choice.is_selected && (
                                <Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                                  (Correcte mais non sélectionnée)
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                          {studentAnswer?.student_answer?.text || studentAnswer?.answer_text || 'Pas de réponse'}
                        </Typography>
                        {studentAnswer?.student_answer?.comment && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #90caf9' }}>
                            <Typography variant="caption" color="textSecondary">
                              Commentaire précédent: {studentAnswer.student_answer.comment}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      💬 Commentaire
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Ajoutez un commentaire pour l'étudiant..."
                      value={comments[question.id] || ''}
                      onChange={(e) => handleCommentChange(question.id, e.target.value)}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>

      {/* Résumé et actions */}
      <Card>
        <CardContent>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h5" fontWeight="600">
                Total: {totalScore.toFixed(1)} / {testData?.total_marks || 100} points
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Pourcentage: {testData?.total_marks ? ((totalScore / testData.total_marks) * 100).toFixed(1) : 0}%
              </Typography>
              <Chip 
                label={totalScore >= (testData?.passing_marks || 50) ? 'Réussi ✓' : 'Échoué ✗'} 
                color={totalScore >= (testData?.passing_marks || 50) ? 'success' : 'error'} 
                sx={{ mt: 1 }}
              />
            </Grid>
            
            <Grid item>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/teacher/tests/${testId}/grade`)}
                >
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveGrading}
                  disabled={loading}
                >
                  Sauvegarder
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<DoneAll />}
                  onClick={handleFinalize}
                  disabled={loading}
                >
                  Finaliser
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Section de débogage */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" color="primary">
              🛠️ Débogage
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowDebug(!showDebug)}
                startIcon={showDebug ? <VisibilityOff /> : <Visibility />}
              >
                {showDebug ? 'Cacher' : 'Afficher'} les détails
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={runDebugTest}
                startIcon={<BugReport />}
              >
                Tester l'API
              </Button>
            </Box>
          </Box>
          
          {showDebug && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Mode réel :</strong> Données chargées depuis l'API.
                  Test: {testId}, Étudiant: {studentId}
                </Typography>
              </Alert>
              
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Réponse API brute:</strong>
                </Typography>
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </Alert>
              
              {debugInfo && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Debug Info:</strong>
                  </Typography>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontSize: '12px'
                  }}>
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </Alert>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Actions de débogage:
                </Typography>
                <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={forceLoadWithAlternativeApproach}
                  >
                    Forcer avec approche alternative
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/teacher/tests/${testId}/grade`)}
                  >
                    Retour à la liste
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={reloadPage}
                  >
                    Recharger la page
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}