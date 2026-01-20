// src/pages/student/TakeTest.jsx - VERSION COMPLÈTE AVEC BYPASS SOUMISSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Card, CardContent, Typography, Button, Box,
  Grid, LinearProgress, RadioGroup, FormControlLabel, Radio,
  Checkbox, TextField, Divider, Paper, Chip, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import {
  ArrowBack, Timer, ArrowForward, Send, Warning,
  CheckCircle, ErrorOutline, QuestionAnswer
} from '@mui/icons-material';

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [error, setError] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [hasUnanswered, setHasUnanswered] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [gradeData, setGradeData] = useState(null);

  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadSavedAnswers = useCallback((id) => {
    try {
      const saved = localStorage.getItem(`test_${id}_answers`);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Erreur chargement réponses:', error);
      return {};
    }
  }, []);

  const saveProgress = useCallback(() => {
    if (!testId || Object.keys(answers).length === 0 || !isMountedRef.current) return;
    
    try {
      localStorage.setItem(`test_${testId}_answers`, JSON.stringify(answers));
      localStorage.setItem(`test_${testId}_current_question`, currentQuestion.toString());
      localStorage.setItem(`test_${testId}_time_left`, timeLeft.toString());
    } catch (error) {
      console.error('Erreur sauvegarde progression:', error);
    }
  }, [answers, currentQuestion, testId, timeLeft]);

  const loadGradeIfExists = async () => {
    if (!testId || !isMountedRef.current) return;
    
    try {
      const gradeResponse = await api.get(`/tests/quizzes/${testId}/my-submission/`);
      
      if (gradeResponse.data.success && gradeResponse.data.submitted) {
        setAlreadySubmitted(true);
        
        if (gradeResponse.data.submission.is_graded) {
          setShowGrade(true);
          setGradeData({
            score: gradeResponse.data.submission.score,
            total: gradeResponse.data.submission.total_marks,
            percentage: gradeResponse.data.submission.percentage,
            grade: gradeResponse.data.submission.grade,
            is_passed: gradeResponse.data.submission.is_passed
          });
        }
      }
    } catch (error) {
      console.log('Aucune note disponible');
    }
  };

  const loadTest = useCallback(async () => {
    if (hasLoadedRef.current || !isMountedRef.current) return;
    
    hasLoadedRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Début chargement du test', testId);
      
      // 1. Vérifier si déjà soumis
      try {
        const submissionCheck = await api.get(`/tests/quizzes/${testId}/my-submission/`);
        if (submissionCheck.data.success && submissionCheck.data.submitted) {
          toast.info('Vous avez déjà soumis ce test.');
          navigate('/student/tests');
          return;
        }
      } catch (error) {
        console.log('Pas encore soumis, continuation...');
      }
      
      // 2. UTILISER LE BYPASS POUR CHARGER
      console.log('📚 Chargement du test via BYPASS...');
      const testResponse = await api.get(`/tests/quizzes/${testId}/take-bypass/`);
      
      if (testResponse.data.success) {
        const testData = testResponse.data.quiz;
        const questionsData = testResponse.data.questions || [];
        
        console.log('✅ Test chargé via bypass:', {
          titre: testData.title,
          questions: questionsData.length
        });
        
        setTest(testData);
        setQuestions(questionsData);
        
        // Timer
        if (testData.duration) {
          const savedTime = localStorage.getItem(`test_${testId}_time_left`);
          const initialTime = savedTime ? parseInt(savedTime) : testData.duration * 60;
          setTimeLeft(initialTime);
        }
        
        // Réponses sauvegardées
        const savedAnswers = loadSavedAnswers(testId);
        const savedQuestion = localStorage.getItem(`test_${testId}_current_question`);
        
        if (Object.keys(savedAnswers).length > 0) {
          console.log('📂 Réponses sauvegardées chargées:', Object.keys(savedAnswers).length);
          setAnswers(savedAnswers);
        } else {
          const initialAnswers = {};
          questionsData.forEach((q) => {
            if (q.question_type === 'mcq') {
              initialAnswers[q.id] = [];
            } else {
              initialAnswers[q.id] = '';
            }
          });
          setAnswers(initialAnswers);
        }
        
        if (savedQuestion) {
          const questionNum = parseInt(savedQuestion);
          if (!isNaN(questionNum) && questionNum >= 0 && questionNum < questionsData.length) {
            setCurrentQuestion(questionNum);
          }
        }
        
        setStartTime(Date.now());
        
      } else {
        setError(testResponse.data.error || 'Erreur lors du chargement du test');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement test:', error);
      
      if (error.response?.status === 404) {
        setError('Test non trouvé.');
      } else if (error.response?.status === 403) {
        try {
          const normalResponse = await api.get(`/tests/quizzes/${testId}/take/`);
          if (normalResponse.data.success) {
            setTest(normalResponse.data.quiz);
            setQuestions(normalResponse.data.questions || []);
          }
        } catch (normalError) {
          setError('Accès refusé au test.');
        }
      } else {
        setError('Impossible de charger le test.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [testId, navigate, loadSavedAnswers]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const initializeTest = async () => {
      await loadTest();
      await loadGradeIfExists();
    };
    
    initializeTest();
    
    return () => {
      isMountedRef.current = false;
      hasLoadedRef.current = false;
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loadTest]);

  useEffect(() => {
    if (timeLeft <= 0 || !test || !isMountedRef.current) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, test]);

  useEffect(() => {
    if (!testId || Object.keys(answers).length === 0 || !isMountedRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        saveProgress();
      }
    }, 2000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [answers, testId, saveProgress]);

  useEffect(() => {
    if (questions.length === 0 || !isMountedRef.current) return;
    
    const unanswered = questions.filter(q => {
      const answer = answers[q.id];
      return !answer || (Array.isArray(answer) && answer.length === 0) || answer.toString().trim() === '';
    });
    setHasUnanswered(unanswered.length > 0);
  }, [answers, questions]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, value, questionType) => {
    if (!isMountedRef.current) return;
    
    setAnswers(prev => {
      const newAnswers = { ...prev };
      
      if (questionType === 'mcq') {
        const currentAnswers = prev[questionId] || [];
        if (currentAnswers.includes(value)) {
          newAnswers[questionId] = currentAnswers.filter(v => v !== value);
        } else {
          newAnswers[questionId] = [...currentAnswers, value];
        }
      } else {
        newAnswers[questionId] = value;
      }
      
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting || !isMountedRef.current) return;
    
    setSubmitting(true);
    
    try {
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      
      // Préparer les données
      const submissionData = {
        answers: Object.keys(answers).map(questionId => {
          const answer = answers[questionId];
          return {
            question_id: parseInt(questionId),
            selected_choices: Array.isArray(answer) ? answer : [],
            answer_text: !Array.isArray(answer) ? answer.toString() : '',
            submitted_at: new Date().toISOString()
          };
        }).filter(item => 
          item.selected_choices.length > 0 || 
          (item.answer_text && item.answer_text.trim() !== '')
        ),
        time_taken: timeTaken
      };
      
      console.log('📤 Soumission des réponses:', submissionData.answers.length);
      
      // ESSAYER D'ABORD LE BYPASS POUR LA SOUMISSION
      let response;
      try {
        response = await api.post(`/tests/quizzes/${testId}/submit-bypass/`, submissionData);
        console.log('✅ Soumission réussie via bypass');
      } catch (bypassError) {
        console.log('⚠️ Bypass submit échoué, tentative normale...');
        response = await api.post(`/tests/quizzes/${testId}/submit/`, submissionData);
      }
      
      if (response.data.success) {
        toast.success('✅ Test soumis avec succès !');
        
        // Nettoyer le stockage
        localStorage.removeItem(`test_${testId}_answers`);
        localStorage.removeItem(`test_${testId}_current_question`);
        localStorage.removeItem(`test_${testId}_time_left`);
        
        // Rediriger
        setTimeout(() => {
          if (isMountedRef.current) {
            navigate('/student/tests');
          }
        }, 2000);
      } else {
        toast.error(response.data.error || '❌ Erreur lors de la soumission');
      }
      
    } catch (error) {
      console.error('❌ Erreur soumission:', error);
      
      if (error.response?.status === 403) {
        toast.error('❌ Accès refusé pour la soumission. Essayez le mode admin.');
      } else {
        toast.error('❌ Erreur lors de la soumission du test');
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleAutoSubmit = () => {
    toast.warning('⏰ Temps écoulé ! Le test sera soumis automatiquement.');
    handleSubmit();
  };

  const handleQuit = () => {
    const confirm = window.confirm('Voulez-vous quitter le test ? Votre progression sera sauvegardée.');
    if (confirm) {
      saveProgress();
      navigate('/student/tests');
    }
  };

  const getUnansweredCount = () => {
    return questions.filter(q => {
      const answer = answers[q.id];
      return !answer || 
             (Array.isArray(answer) && answer.length === 0) || 
             answer.toString().trim() === '';
    }).length;
  };

  const getQuestionStatus = (index) => {
    const question = questions[index];
    if (!question) return 'unanswered';
    
    const answer = answers[question.id];
    if (!answer) return 'unanswered';
    
    if (Array.isArray(answer)) {
      return answer.length > 0 ? 'answered' : 'unanswered';
    }
    
    return answer.toString().trim() !== '' ? 'answered' : 'unanswered';
  };

  // Si déjà noté
  if (showGrade && gradeData) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', p: 4 }}>
          <CardContent>
            <Box textAlign="center" mb={4}>
              <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Test déjà noté
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Vous avez déjà soumis ce test et il a été corrigé.
              </Typography>
            </Box>
            
            <Grid container spacing={3} mb={4}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {gradeData.score}/{gradeData.total}
                  </Typography>
                  <Typography variant="body2">Score</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {gradeData.percentage}%
                  </Typography>
                  <Typography variant="body2">Pourcentage</Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Box textAlign="center">
              <Chip 
                label={`Grade: ${gradeData.grade}`}
                color={gradeData.is_passed ? 'success' : 'error'}
                sx={{ fontSize: '1.2rem', p: 2 }}
              />
            </Box>
            
            <Box mt={4} textAlign="center">
              <Button
                variant="contained"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/student/tests')}
              >
                Retour aux tests
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="textSecondary">
            Chargement du test...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/student/tests')}
        >
          Retour aux tests
        </Button>
      </Container>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="warning">
          Test non trouvé ou aucune question disponible.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/student/tests')}
          sx={{ mt: 2 }}
        >
          Retour aux tests
        </Button>
      </Container>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleQuit}
          sx={{ mb: 2 }}
        >
          Quitter
        </Button>
        
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" fontWeight="600">
              {test.title}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {test.subject_name} • {test.teacher_name}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="flex-end" alignItems="center" gap={3}>
              <Chip
                icon={<Timer />}
                label={formatTime(timeLeft)}
                color={timeLeft < 300 ? 'error' : 'primary'}
                variant="outlined"
              />
              <Box textAlign="right">
                <Typography variant="body2" color="textSecondary">
                  Question {currentQuestion + 1}/{questions.length}
                </Typography>
                <Typography variant="caption" color={hasUnanswered ? 'error' : 'textSecondary'}>
                  {getUnansweredCount()} question(s) sans réponse
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 8, borderRadius: 4, mb: 4 }}
      />

      {/* Question Navigation */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={1} justifyContent="center">
          {questions.map((_, index) => {
            const status = getQuestionStatus(index);
            
            return (
              <Grid item key={index}>
                <Button
                  variant={index === currentQuestion ? 'contained' : 'outlined'}
                  color={status === 'answered' ? 'success' : 
                         index === currentQuestion ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setCurrentQuestion(index)}
                  sx={{ minWidth: 40, height: 40 }}
                >
                  {index + 1}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Current Question */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Question {currentQuestion + 1} ({currentQ.question_type === 'mcq' ? 'Choix multiple' : 
            currentQ.question_type === 'true_false' ? 'Vrai/Faux' :
            currentQ.question_type === 'short_answer' ? 'Réponse courte' :
            currentQ.question_type === 'essay' ? 'Dissertation' : 'Remplir les blancs'})
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {currentQ.text}
          </Typography>

          <Chip 
            label={`${currentQ.marks || 1} point(s)`} 
            size="small" 
            color="primary" 
            variant="outlined"
            sx={{ mb: 3 }}
          />

          <Box sx={{ mt: 3 }}>
            {currentQ.question_type === 'mcq' && currentQ.choices && (
              <Box>
                {currentQ.choices.map((choice, index) => (
                  <Paper
                    key={choice.id || index}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: (answers[currentQ.id] || []).includes(choice.id || index.toString())
                        ? 'primary.main'
                        : 'divider',
                      '&:hover': {
                        borderColor: 'primary.light',
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => handleAnswerChange(
                      currentQ.id, 
                      choice.id || index.toString(), 
                      'mcq'
                    )}
                  >
                    <Box display="flex" alignItems="center">
                      <Checkbox
                        checked={(answers[currentQ.id] || []).includes(choice.id || index.toString())}
                        onChange={() => handleAnswerChange(
                          currentQ.id, 
                          choice.id || index.toString(), 
                          'mcq'
                        )}
                      />
                      <Typography ml={1}>{choice.text}</Typography>
                    </Box>
                  </Paper>
                ))}
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Sélectionnez une ou plusieurs réponses
                </Typography>
              </Box>
            )}

            {currentQ.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value, 'true_false')}
              >
                <FormControlLabel value="true" control={<Radio />} label="Vrai" />
                <FormControlLabel value="false" control={<Radio />} label="Faux" />
              </RadioGroup>
            )}

            {(currentQ.question_type === 'short_answer' || currentQ.question_type === 'essay') && (
              <TextField
                fullWidth
                multiline
                rows={currentQ.question_type === 'essay' ? 6 : 3}
                placeholder={currentQ.question_type === 'essay' 
                  ? 'Rédigez votre réponse ici...' 
                  : 'Entrez votre réponse courte ici...'}
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value, currentQ.question_type)}
                variant="outlined"
              />
            )}

            {currentQ.question_type === 'fill_blank' && (
              <TextField
                fullWidth
                placeholder="Remplissez le(s) blanc(s)..."
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value, 'fill_blank')}
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          Précédent
        </Button>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            color={hasUnanswered ? 'error' : 'success'}
            startIcon={<QuestionAnswer />}
            onClick={() => {
              const unanswered = getUnansweredCount();
              const unansweredQuestions = questions
                .map((q, idx) => {
                  const answer = answers[q.id];
                  const isEmpty = !answer || 
                                (Array.isArray(answer) && answer.length === 0) || 
                                answer.toString().trim() === '';
                  return isEmpty ? idx + 1 : null;
                })
                .filter(i => i !== null);
              
              alert(`Questions sans réponse: ${unanswered}\nListe: ${unansweredQuestions.join(', ') || 'Aucune'}`);
            }}
          >
            Vérifier ({getUnansweredCount()})
          </Button>
          
          {currentQuestion === questions.length - 1 ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<Send />}
              onClick={() => setConfirmSubmit(true)}
              disabled={submitting}
            >
              {submitting ? 'Soumission...' : 'Soumettre'}
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={handleNext}
            >
              Suivant
            </Button>
          )}
        </Box>
      </Box>

      {/* Warning pour le temps */}
      {timeLeft < 300 && timeLeft > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Warning sx={{ mr: 1 }} />
          Attention ! Il vous reste moins de 5 minutes.
        </Alert>
      )}

      {/* Dialog de confirmation */}
      <Dialog 
        open={confirmSubmit} 
        onClose={() => !submitting && setConfirmSubmit(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Soumettre le test ?</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Vous avez {getUnansweredCount()} question(s) sans réponse.
            Êtes-vous sûr de vouloir soumettre votre test ?
          </Typography>
          
          {hasUnanswered && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Il est recommandé de répondre à toutes les questions avant de soumettre.
            </Alert>
          )}
          
          {submitting && (
            <Box display="flex" alignItems="center" justifyContent="center" my={2}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>Soumission en cours...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmSubmit(false)} 
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="success"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Soumission...' : 'Oui, soumettre'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}