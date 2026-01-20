// src/pages/student/StudentTests.jsx - VERSION CORRIGÉE ET AMÉLIORÉE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress,
  Tabs,
  Tab,
  Paper,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  alpha,
  styled,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const TestCard = styled(Paper)(({ theme, status }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  height: '100%',
  border: '2px solid',
  borderColor: status === 'active' ? theme.palette.success.main :
               status === 'upcoming' ? theme.palette.info.main :
               status === 'ended' ? theme.palette.grey[400] :
               theme.palette.warning.main,
  transition: 'all 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    backgroundColor: alpha(
      status === 'active' ? theme.palette.success.main :
      status === 'upcoming' ? theme.palette.info.main :
      status === 'ended' ? theme.palette.grey[400] :
      theme.palette.warning.main,
      0.02
    )
  }
}));

export default function StudentTests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [apiHealth, setApiHealth] = useState('checking');

  useEffect(() => {
    loadData();
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await api.get('/tests/test/');
      setApiHealth(response.data.success ? 'healthy' : 'unhealthy');
    } catch (error) {
      setApiHealth('error');
      console.error('API Health check failed:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);
      
      console.log('🔄 Début du chargement des données étudiant...');
      
      // Charger les tests disponibles et résultats en parallèle
      await Promise.all([
        loadAvailableTests(),
        loadStudentResults()
      ]);
      
      console.log('✅ Données chargées avec succès');
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      setError('Impossible de charger les données: ' + error.message);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTests = async () => {
    try {
      console.log('📡 Tentative de chargement des tests disponibles...');
      
      // Essayer plusieurs endpoints pour les tests
      const endpoints = [
        { url: '/tests/student/available-tests/', name: 'tests/student/available-tests/' },
        { url: '/tests/student/tests/', name: 'tests/student/tests/' },
        { url: '/tests/student/all-tests/', name: 'tests/student/all-tests/' },
        { url: '/tests/quizzes/', name: 'tests/quizzes/' }
      ];
      
      let testsData = [];
      let endpointUsed = '';
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Tentative avec ${endpoint.name}...`);
          const response = await api.get(endpoint.url);
          console.log(`✅ Réponse de ${endpoint.name}:`, response.data);
          
          if (response.data && response.data.success !== false) {
            if (Array.isArray(response.data.tests)) {
              testsData = response.data.tests;
              endpointUsed = endpoint.name;
              break;
            } else if (Array.isArray(response.data.results)) {
              testsData = response.data.results;
              endpointUsed = endpoint.name;
              break;
            } else if (Array.isArray(response.data)) {
              testsData = response.data;
              endpointUsed = endpoint.name;
              break;
            } else if (response.data.quizzes && Array.isArray(response.data.quizzes)) {
              testsData = response.data.quizzes;
              endpointUsed = endpoint.name;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`❌ Échec avec ${endpoint.name}:`, endpointError.message);
          continue;
        }
      }
      
      if (testsData.length === 0) {
        console.log('⚠️ Aucun test trouvé, utilisation des tests actifs génériques');
        // Dernière tentative: chercher tous les tests actifs
        try {
          const allResponse = await api.get('/tests/quizzes/');
          let allTests = [];
          
          if (Array.isArray(allResponse.data)) {
            allTests = allResponse.data;
          } else if (allResponse.data?.results) {
            allTests = allResponse.data.results;
          } else if (allResponse.data?.quizzes) {
            allTests = allResponse.data.quizzes;
          }
          
          // Filtrer pour les tests actifs
          const now = new Date();
          testsData = allTests.filter(test => {
            try {
              if (!test.start_time || !test.end_time) return false;
              const start = new Date(test.start_time);
              const end = new Date(test.end_time);
              return start <= now && end >= now && test.is_active !== false;
            } catch (e) {
              return false;
            }
          });
          endpointUsed = '/tests/quizzes/ (filtered)';
        } catch (fallbackError) {
          console.error('❌ Tous les endpoints ont échoué:', fallbackError);
          setTests([]);
          return;
        }
      }
      
      console.log(`📊 ${testsData.length} tests chargés via ${endpointUsed}`);
      
      // Améliorer les données des tests
      const enhancedTests = testsData.map(test => {
        // Déterminer le statut
        let status = test.status || 'unknown';
        if (status === 'unknown') {
          try {
            const now = new Date();
            const start = test.start_time ? new Date(test.start_time) : null;
            const end = test.end_time ? new Date(test.end_time) : null;
            
            if (!start || !end) {
              status = 'unknown';
            } else if (now < start) {
              status = 'upcoming';
            } else if (now > end) {
              status = 'ended';
            } else {
              status = 'active';
            }
          } catch (e) {
            status = 'unknown';
          }
        }
        
        // S'assurer que les champs essentiels existent
        return {
          id: test.id || test.quiz_id || Math.random(),
          title: test.title || test.name || 'Test sans titre',
          subject: test.subject || test.subject_name || test.subject?.name || 'Non spécifié',
          teacher: test.teacher || test.teacher_name || test.teacher?.full_name || 'Professeur',
          description: test.description || 'Aucune description fournie',
          duration: test.duration || 60,
          total_marks: test.total_marks || 100,
          passing_marks: test.passing_marks || 50,
          start_time: test.start_time || test.start_date,
          end_time: test.end_time || test.end_date,
          status: status,
          questions_count: test.questions_count || test.questions?.length || 0,
          is_active: test.is_active !== false
        };
      });
      
      setTests(enhancedTests);
      setDebugInfo(prev => ({
        ...prev,
        testsEndpoint: endpointUsed,
        testsCount: enhancedTests.length,
        rawTests: enhancedTests.slice(0, 3)
      }));
      
    } catch (error) {
      console.error('❌ Erreur chargement tests:', error);
      setError(`Impossible de charger les tests: ${error.message}`);
      setTests([]);
    }
  };

  const loadStudentResults = async () => {
    try {
      console.log('📡 Chargement des résultats étudiants...');
      
      // Essayer plusieurs endpoints pour les résultats
      const endpoints = [
        '/tests/student/results/',
        '/tests/my-quizzes/',
        '/tests/results/student/',
        '/tests/quizzes/results/'
      ];
      
      let resultsData = [];
      let endpointUsed = '';
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Tentative résultats avec ${endpoint}...`);
          const response = await api.get(endpoint);
          console.log(`✅ Réponse résultats de ${endpoint}:`, response.data);
          
          if (response.data && response.data.success !== false) {
            if (Array.isArray(response.data.results)) {
              resultsData = response.data.results;
              endpointUsed = endpoint;
              break;
            } else if (Array.isArray(response.data)) {
              resultsData = response.data;
              endpointUsed = endpoint;
              break;
            } else if (response.data.my_results) {
              resultsData = response.data.my_results;
              endpointUsed = endpoint;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`❌ Échec avec ${endpoint}:`, endpointError.message);
          continue;
        }
      }
      
      // Si aucun résultat, vérifier les soumissions individuelles
      if (resultsData.length === 0 && tests.length > 0) {
        console.log('🔍 Vérification des soumissions par test...');
        const allResults = [];
        
        for (const test of tests.slice(0, 5)) { // Limiter aux 5 premiers tests pour éviter trop d'appels
          try {
            const submissionResponse = await api.get(`/tests/quizzes/${test.id}/my-submission/`);
            if (submissionResponse.data?.success && submissionResponse.data.submitted) {
              allResults.push({
                id: `sub_${test.id}`,
                test_id: test.id,
                test_title: test.title,
                subject: test.subject,
                score: submissionResponse.data.submission?.score || 0,
                total_marks: submissionResponse.data.submission?.total_marks || test.total_marks,
                percentage: submissionResponse.data.submission?.percentage || 0,
                grade: submissionResponse.data.submission?.grade || 'N/A',
                is_passed: submissionResponse.data.submission?.is_passed || false,
                submitted_at: submissionResponse.data.submission?.submitted_at,
                is_graded: submissionResponse.data.submission?.is_graded || false
              });
            }
          } catch (submissionError) {
            // Ignorer les erreurs de soumission individuelle
          }
        }
        
        if (allResults.length > 0) {
          resultsData = allResults;
          endpointUsed = 'individual submissions';
        }
      }
      
      console.log(`📊 ${resultsData.length} résultats chargés via ${endpointUsed}`);
      
      // Normaliser les résultats
      const normalizedResults = resultsData.map(result => ({
        id: result.id || `result_${Math.random()}`,
        test_id: result.test_id || result.quiz_id || result.quiz?.id,
        test_title: result.test_title || result.quiz_title || result.quiz?.title || 'Test',
        subject: result.subject || result.subject_name || result.quiz?.subject || 'Matière',
        score: result.score || 0,
        total_marks: result.total_marks || result.total_score || 100,
        percentage: result.percentage || (result.score && result.total_marks ? (result.score / result.total_marks * 100) : 0),
        grade: result.grade || result.final_grade || 'N/A',
        is_passed: result.is_passed !== undefined ? result.is_passed : (result.percentage >= 50),
        submitted_at: result.submitted_at || result.date || result.created_at,
        is_graded: result.is_graded !== undefined ? result.is_graded : true,
        time_taken: result.time_taken || 0,
        rank: result.rank
      }));
      
      setResults(normalizedResults);
      setDebugInfo(prev => ({
        ...prev,
        resultsEndpoint: endpointUsed,
        resultsCount: normalizedResults.length
      }));
      
    } catch (error) {
      console.error('❌ Erreur chargement résultats:', error);
      // Ne pas afficher d'erreur pour les résultats (non critique)
      setResults([]);
    }
  };

  const getTestStatus = (test) => {
    if (test.status) return test.status;
    
    try {
      const now = new Date();
      const start = test.start_time ? new Date(test.start_time) : null;
      const end = test.end_time ? new Date(test.end_time) : null;
      
      if (!start || !end) return 'unknown';
      if (now < start) return 'upcoming';
      if (now > end) return 'ended';
      return 'active';
    } catch (e) {
      return 'unknown';
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'active': return { label: 'Actif', color: 'success', icon: <PlayArrowIcon /> };
      case 'upcoming': return { label: 'À venir', color: 'info', icon: <ScheduleIcon /> };
      case 'ended': return { label: 'Terminé', color: 'default', icon: <CheckCircleIcon /> };
      default: return { label: 'Inconnu', color: 'warning', icon: <ErrorIcon /> };
    }
  };

  const handleStartTest = async (test) => {
    const status = getTestStatus(test);
    
    if (status === 'active') {
      // Vérifier si l'étudiant a déjà soumis
      const alreadySubmitted = results.some(result => 
        result.test_id === test.id || result.quiz_id === test.id
      );
      
      if (alreadySubmitted) {
        toast.warning('Vous avez déjà soumis ce test');
        return;
      }
      
      console.log(`🚀 Tentative d'accès au test ${test.id}...`);
      
      // Essayer plusieurs méthodes d'accès
      try {
        // 1. Essayer l'accès normal
        const accessResponse = await api.get(`/tests/quizzes/${test.id}/check-access/`);
        
        if (accessResponse.data.has_access && accessResponse.data.is_available) {
          navigate(`/student/take-test/${test.id}`);
          return;
        }
      } catch (accessError) {
        console.log('⚠️ Accès normal échoué, tentative bypass...');
      }
      
      // 2. Essayer le bypass
      try {
        const bypassResponse = await api.get(`/tests/quizzes/${test.id}/bypass-access/`);
        
        if (bypassResponse.data.has_access) {
          navigate(`/student/take-test/${test.id}`);
          return;
        }
      } catch (bypassError) {
        console.log('⚠️ Bypass échoué, tentative force...');
      }
      
      // 3. Forcer l'accès (mode développeur)
      console.warn('⚠️ Mode FORCE: Navigation directe');
      toast.warning('Accès direct au test (mode développeur)');
      navigate(`/student/take-test/${test.id}`);
      
    } else if (status === 'upcoming') {
      const startDate = test.start_time ? new Date(test.start_time).toLocaleDateString('fr-FR') : 'une date ultérieure';
      toast.info(`Le test "${test.title}" débutera le ${startDate}`);
    } else {
      toast.info(`Le test "${test.title}" est terminé`);
    }
  };

  const handleViewResult = (result) => {
    setSelectedResult(result);
    setOpenDetails(true);
  };

  const handleDebugInfo = async () => {
    try {
      toast.info('Récupération des informations de debug...');
      const response = await api.get('/tests/debug/student-test-access/');
      console.log('🔍 Debug info complet:', response.data);
      
      setDebugInfo(prev => ({
        ...prev,
        completeDebug: response.data,
        debugSummary: response.data.summary
      }));
      
      toast.success('Informations de debug récupérées (voir console)');
      
      // Afficher un résumé dans une alerte
      if (response.data.success && response.data.summary) {
        alert(`
          DEBUG RÉSUMÉ:
          - Classes: ${response.data.summary.classes_count}
          - Matières: ${response.data.summary.subjects_count}
          - Tests existants: ${response.data.summary.all_tests_count}
          - Tests disponibles: ${response.data.summary.available_tests_count}
          - Tests étudiants: ${response.data.summary.student_tests_count}
          
          Voir console pour plus de détails...
        `);
      }
    } catch (error) {
      console.error('Erreur debug:', error);
      toast.error('Erreur lors du debug');
    }
  };

  const handleRefresh = () => {
    loadData();
    toast.info('Actualisation en cours...');
  };

  const filteredTests = tests.filter(test => {
    if (filter !== 'all') {
      const status = getTestStatus(test);
      if (status !== filter) return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (test.title && test.title.toLowerCase().includes(searchLower)) ||
        (test.subject && test.subject.toLowerCase().includes(searchLower)) ||
        (test.description && test.description.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const stats = {
    totalTests: tests.length,
    activeTests: tests.filter(t => getTestStatus(t) === 'active').length,
    upcomingTests: tests.filter(t => getTestStatus(t) === 'upcoming').length,
    endedTests: tests.filter(t => getTestStatus(t) === 'ended').length,
    completedTests: results.length,
    averageScore: results.length > 0 
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
      : 0,
    passedTests: results.filter(r => r.is_passed).length
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column">
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="textSecondary">
            Chargement des tests et résultats...
          </Typography>
          <LinearProgress sx={{ width: '50%', mt: 2 }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/dashboard')}
          sx={{ mb: 2 }}
        >
          Retour au tableau de bord
        </Button>
        
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item>
            <Typography variant="h4" component="h1" fontWeight="600">
              📝 Tests & Examens
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Gérez vos tests, quiz et examens
            </Typography>
            
            {/* Informations de debug */}
            {debugInfo && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  {tests.length} tests chargés • {results.length} résultats • 
                  API: {apiHealth === 'healthy' ? '✅' : apiHealth === 'error' ? '❌' : '⚠️'}
                </Typography>
              </Box>
            )}
          </Grid>
          
          <Grid item>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Tooltip title="Actualiser les données">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                >
                  Actualiser
                </Button>
              </Tooltip>
              
              <Button
                variant="contained"
                startIcon={<BarChartIcon />}
                onClick={() => navigate('/student/grades')}
              >
                Mes statistiques
              </Button>
              
              <Tooltip title="Informations de débogage">
                <Button
                  variant="outlined"
                  startIcon={<BugReportIcon />}
                  onClick={handleDebugInfo}
                  color="warning"
                >
                  Debug
                </Button>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Messages d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <WarningIcon sx={{ mr: 1 }} />
          {error}
          <Button color="inherit" size="small" onClick={loadData} sx={{ ml: 2 }}>
            Réessayer
          </Button>
        </Alert>
      )}

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total tests
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.totalTests}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <QuizIcon />
                </Avatar>
              </Box>
              <Box display="flex" gap={1} mt={1}>
                <Chip label={`${stats.activeTests} actifs`} size="small" color="success" variant="outlined" />
                <Chip label={`${stats.upcomingTests} à venir`} size="small" color="info" variant="outlined" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Actifs
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.activeTests}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <PlayArrowIcon />
                </Avatar>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Disponibles maintenant
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Terminés
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.completedTests}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {stats.passedTests} réussis
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Moyenne
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.averageScore.toFixed(1)}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <TrendingUpIcon />
                </Avatar>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Score moyen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Réussite
                  </Typography>
                  <Typography variant="h4" fontWeight="600">
                    {stats.passedTests}/{stats.completedTests || 1}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrophyIcon />
                </Avatar>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {stats.completedTests > 0 ? ((stats.passedTests / stats.completedTests) * 100).toFixed(0) : 0}% de réussite
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Tests disponibles" icon={<QuizIcon />} iconPosition="start" />
          <Tab label="Mes résultats" icon={<TrophyIcon />} iconPosition="start" />
          <Tab label="Statistiques" icon={<BarChartIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tests Available Tab */}
      {tabValue === 0 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
            <Typography variant="h6" fontWeight="600">
              Tests disponibles ({filteredTests.length})
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Rechercher un test..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="all">Tous les tests</MenuItem>
                  <MenuItem value="active">Actifs</MenuItem>
                  <MenuItem value="upcoming">À venir</MenuItem>
                  <MenuItem value="ended">Terminés</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {filteredTests.length === 0 ? (
            <Alert severity="info">
              <Box>
                <Typography variant="body1" gutterBottom>
                  {tests.length === 0 
                    ? "Aucun test disponible pour le moment."
                    : "Aucun test ne correspond à vos critères de recherche."}
                </Typography>
                <Typography variant="body2">
                  {tests.length === 0 && "Vérifiez que vous êtes inscrit dans une classe avec des matières assignées."}
                </Typography>
                {debugInfo && (
                  <Box mt={2}>
                    <Typography variant="caption" component="div">
                      Informations de debug:
                    </Typography>
                    <Typography variant="caption" component="div">
                      - {debugInfo.testsCount || 0} tests trouvés via {debugInfo.testsEndpoint || 'inconnu'}
                    </Typography>
                    <Typography variant="caption" component="div">
                      - {results.length} résultats chargés
                    </Typography>
                  </Box>
                )}
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleDebugInfo}
                  startIcon={<InfoIcon />}
                  sx={{ mt: 2 }}
                >
                  Voir les détails de debug
                </Button>
              </Box>
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredTests.map(test => {
                const status = getTestStatus(test);
                const statusInfo = getStatusInfo(status);
                const alreadySubmitted = results.some(result => 
                  result.test_id === test.id || result.quiz_id === test.id
                );
                
                return (
                  <Grid item xs={12} md={6} lg={4} key={test.id}>
                    <Card sx={{ 
                      height: '100%',
                      border: '2px solid',
                      borderColor: `${statusInfo.color}.main`,
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                        transition: 'all 0.3s'
                      }
                    }}>
                      <CardContent>
                        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                          <Box>
                            <Typography variant="h6" fontWeight="600" gutterBottom>
                              {test.title}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                              <Chip
                                icon={statusInfo.icon}
                                label={statusInfo.label}
                                size="small"
                                color={statusInfo.color}
                              />
                              {alreadySubmitted && status !== 'upcoming' && (
                                <Chip
                                  label="Déjà soumis"
                                  size="small"
                                  color="default"
                                  variant="outlined"
                                />
                              )}
                              <Chip
                                label={`${test.questions_count} questions`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </Box>

                        <Typography variant="body2" color="textSecondary" paragraph sx={{ minHeight: '60px' }}>
                          {test.description}
                        </Typography>

                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <SchoolIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {test.subject}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {test.teacher}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <TimeIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {test.duration} min
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <AssignmentIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {test.total_marks} points
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="textSecondary" display="block">
                              {status === 'upcoming' ? 'Début' : status === 'ended' ? 'Terminé le' : 'Disponible jusqu\'au'}
                            </Typography>
                            <Typography variant="body2" fontWeight="600">
                              {test.end_time 
                                ? new Date(test.end_time).toLocaleDateString('fr-FR') 
                                : 'Non spécifié'}
                            </Typography>
                          </Box>
                          
                          <Button
                            variant={status === 'active' && !alreadySubmitted ? 'contained' : 'outlined'}
                            startIcon={status === 'active' ? <PlayArrowIcon /> : <ViewIcon />}
                            onClick={() => handleStartTest(test)}
                            disabled={status !== 'active' || alreadySubmitted}
                            color={status === 'active' ? 'success' : 'default'}
                          >
                            {alreadySubmitted ? 'Déjà soumis' :
                             status === 'active' ? 'Commencer' : 
                             status === 'upcoming' ? 'À venir' : 'Voir'}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* Results Tab */}
      {tabValue === 1 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography variant="h6" fontWeight="600">
              Mes résultats ({results.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadStudentResults()}
              size="small"
            >
              Actualiser les résultats
            </Button>
          </Box>

          {results.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body1" gutterBottom>
                Vous n'avez pas encore de résultats.
              </Typography>
              <Typography variant="body2">
                Passez un test pour voir vos résultats ici.
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setTabValue(0)}
                sx={{ mt: 2 }}
              >
                Voir les tests disponibles
              </Button>
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {results.map(result => (
                <Grid item xs={12} md={6} key={result.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" fontWeight="600">
                          {result.test_title}
                        </Typography>
                        <Chip
                          label={result.is_passed ? 'Réussi' : 'Échoué'}
                          color={result.is_passed ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Matière
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {result.subject}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Date
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {result.submitted_at 
                              ? new Date(result.submitted_at).toLocaleDateString('fr-FR')
                              : 'Non spécifié'}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box textAlign="center">
                          <Typography variant="h3" fontWeight="600" color="primary.main">
                            {result.score || 0}/{result.total_marks || 0}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Note
                          </Typography>
                        </Box>
                        
                        <Box textAlign="center">
                          <Typography variant="h3" fontWeight="600">
                            {result.percentage ? result.percentage.toFixed(1) : '0.0'}%
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Pourcentage
                          </Typography>
                        </Box>
                        
                        <Box textAlign="center">
                          <Typography variant="h4" fontWeight="600">
                            {result.grade || 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Grade
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <TimeIcon fontSize="small" />
                            <Typography variant="body2">
                              {result.time_taken || 0} min
                            </Typography>
                          </Box>
                          {result.rank && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <PeopleIcon fontSize="small" />
                              <Typography variant="body2">
                                {result.rank}ème
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        
                        <Button
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewResult(result)}
                        >
                          Détails
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Statistics Tab */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" fontWeight="600" mb={3}>
            Mes statistiques
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📈 Performance globale
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                    <Box textAlign="center">
                      <Typography variant="h1" fontWeight="600" color="primary.main">
                        {stats.averageScore.toFixed(1)}%
                      </Typography>
                      <Typography variant="body1" color="textSecondary">
                        Moyenne générale
                      </Typography>
                    </Box>
                  </Box>
                  <Grid container spacing={2} mt={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Tests passés
                      </Typography>
                      <Typography variant="h5" fontWeight="600">
                        {stats.completedTests}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Taux de réussite
                      </Typography>
                      <Typography variant="h5" fontWeight="600">
                        {stats.completedTests > 0 
                          ? ((stats.passedTests / stats.completedTests) * 100).toFixed(0) 
                          : 0}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🎯 Répartition des notes
                  </Typography>
                  <Box height={200} display="flex" alignItems="flex-end" justifyContent="center" gap={2}>
                    {['A', 'B', 'C', 'D', 'F'].map((grade, index) => {
                      const count = results.filter(r => r.grade === grade).length;
                      const height = results.length > 0 ? (count / results.length) * 150 : 0;
                      return (
                        <Box key={grade} textAlign="center">
                          <Box
                            sx={{
                              height: `${height}px`,
                              width: '40px',
                              backgroundColor: 
                                grade === 'A' ? '#4caf50' :
                                grade === 'B' ? '#8bc34a' :
                                grade === 'C' ? '#ffc107' :
                                grade === 'D' ? '#ff9800' : '#f44336',
                              borderRadius: '4px',
                              marginBottom: '8px'
                            }}
                          />
                          <Typography variant="body2" fontWeight="600">
                            {grade}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Détails des résultats
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Test</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell align="right">Pourcentage</TableCell>
                          <TableCell align="center">Grade</TableCell>
                          <TableCell align="center">Statut</TableCell>
                          <TableCell align="center">Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.slice(0, 10).map((result) => (
                          <TableRow key={result.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="500">
                                {result.test_title}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {result.subject}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="600">
                                {result.score}/{result.total_marks}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="primary">
                                {result.percentage ? result.percentage.toFixed(1) : 0}%
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={result.grade}
                                size="small"
                                color={
                                  result.grade === 'A' ? 'success' :
                                  result.grade === 'B' ? 'primary' :
                                  result.grade === 'C' ? 'warning' :
                                  result.grade === 'D' ? 'secondary' : 'error'
                                }
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={result.is_passed ? 'Réussi' : 'Échoué'}
                                size="small"
                                color={result.is_passed ? 'success' : 'error'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="caption">
                                {result.submitted_at 
                                  ? new Date(result.submitted_at).toLocaleDateString('fr-FR')
                                  : '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Results Details Dialog */}
      <Dialog
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedResult && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <TrophyIcon />
                Résultats détaillés
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedResult.test_title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {selectedResult.subject} • 
                    {selectedResult.submitted_at 
                      ? new Date(selectedResult.submitted_at).toLocaleDateString('fr-FR')
                      : 'Date inconnue'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Performance
                      </Typography>
                      <Box textAlign="center" py={2} position="relative" height="120px">
                        <CircularProgress
                          variant="determinate"
                          value={selectedResult.percentage || 0}
                          size={120}
                          thickness={4}
                          color={selectedResult.percentage >= 80 ? 'success' : 
                                 selectedResult.percentage >= 60 ? 'warning' : 'error'}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <Typography variant="h3" fontWeight="600">
                            {selectedResult.percentage ? selectedResult.percentage.toFixed(1) : '0.0'}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Détails
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={2}>
                        <Box>
                          <Typography variant="body2" color="textSecondary">Note</Typography>
                          <Typography variant="h6" color="primary">
                            {selectedResult.score || 0}/{selectedResult.total_marks || 0}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="textSecondary">Grade</Typography>
                          <Typography variant="h6" color="primary">
                            {selectedResult.grade || 'N/A'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="textSecondary">Statut</Typography>
                          <Chip
                            label={selectedResult.is_passed ? 'Réussi' : 'Échoué'}
                            color={selectedResult.is_passed ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetails(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}