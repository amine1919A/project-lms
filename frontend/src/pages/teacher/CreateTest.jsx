// src/pages/teacher/CreateTest.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import {
  Container, Card, CardContent, Typography, TextField, Button,
  Box, Grid, MenuItem, IconButton, Paper, Divider, FormControl,
  InputLabel, Select, Stack, Chip, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import {
  Add, Delete, ArrowBack, Save, School, AccessTime,
  Grade, Assignment, RadioButtonChecked, CheckBox
} from '@mui/icons-material';

export default function CreateTest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  
  const [testData, setTestData] = useState({
    title: '',
    subject: '',
    quiz_type: 'quiz',
    description: '',
    instructions: '',
    duration: 60,
    total_marks: 100,
    passing_marks: 50,
    start_time: '',
    end_time: ''
  });

  const [questions, setQuestions] = useState([
    {
      question_type: 'mcq',
      text: '',
      marks: 1,
      order: 0,
      true_false_answer: true, // Pour les questions Vrai/Faux
      answer_text: '', // Pour les réponses courtes et dissertations
      fill_blank_answer: '', // Pour remplir les blancs
      choices: [
        { text: '', is_correct: false, order: 0 },
        { text: '', is_correct: true, order: 1 },
        { text: '', is_correct: false, order: 2 }
      ]
    }
  ]);

  useEffect(() => {
    loadSubjects();
    
    // Initialiser les dates par défaut
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setTestData(prev => ({
      ...prev,
      start_time: formatDateTimeLocal(now),
      end_time: formatDateTimeLocal(tomorrow)
    }));
  }, []);

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const loadSubjects = async () => {
    try {
      console.log('Chargement des matières...');
      
      // Essayer l'endpoint /classes/subjects/
      try {
        const response = await api.get('/classes/subjects/');
        console.log('✅ API Response:', response.status, response.data);
        
        if (Array.isArray(response.data)) {
          setSubjects(response.data);
          console.log(`${response.data.length} matières chargées`);
        } else if (response.data?.results) {
          setSubjects(response.data.results);
          console.log(`${response.data.results.length} matières chargées`);
        } else {
          console.warn('Format de réponse inattendu:', response.data);
          setDefaultSubjects();
        }
      } catch (error) {
        console.error('❌ Erreur API /classes/subjects/:', error.message);
        setDefaultSubjects();
      }
    } catch (error) {
      console.error('❌ Erreur générale chargement matières:', error);
      setDefaultSubjects();
    }
  };

  const setDefaultSubjects = () => {
    const defaultSubjects = [
      { id: 1, name: 'Algorithmique' },
      { id: 2, name: 'Base de Données' },
      { id: 3, name: 'Développement Web' },
      { id: 4, name: 'Systèmes d\'Exploitation' },
      { id: 5, name: 'Réseaux Informatiques' }
    ];
    
    setSubjects(defaultSubjects);
    toast.warning('Utilisation des matières par défaut');
  };

  const handleTestDataChange = (field, value) => {
    console.log(`Modification ${field}:`, value);
    
    // Gestion spéciale pour les champs numériques
    if (['duration', 'total_marks', 'passing_marks'].includes(field)) {
      const numValue = value === '' ? 0 : parseInt(value, 10);
      if (isNaN(numValue)) {
        toast.error(`Valeur invalide pour ${field}`);
        return;
      }
      
      // Validation supplémentaire
      if (field === 'duration' && numValue < 1) {
        toast.error('La durée doit être d\'au moins 1 minute');
        return;
      }
      
      if (field === 'total_marks' && numValue < 1) {
        toast.error('Le total des points doit être positif');
        return;
      }
      
      if (field === 'passing_marks' && numValue < 0) {
        toast.error('La note de passage ne peut pas être négative');
        return;
      }
      
      setTestData(prev => ({
        ...prev,
        [field]: numValue
      }));
    } else {
      setTestData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    
    // Gestion spéciale pour les points des questions
    if (field === 'marks') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0) {
        toast.error('Les points doivent être un nombre positif');
        return;
      }
      newQuestions[index][field] = numValue;
    } else if (field === 'true_false_answer') {
      // Pour les questions Vrai/Faux
      newQuestions[index][field] = value === 'true' || value === true;
    } else if (field === 'question_type') {
      // Changer le type de question
      newQuestions[index][field] = value;
      
      // Réinitialiser les données selon le type
      if (value === 'true_false') {
        newQuestions[index].choices = [];
        newQuestions[index].true_false_answer = true;
        newQuestions[index].answer_text = '';
        newQuestions[index].fill_blank_answer = '';
      } else if (value === 'mcq') {
        newQuestions[index].choices = [
          { text: '', is_correct: false, order: 0 },
          { text: '', is_correct: true, order: 1 },
          { text: '', is_correct: false, order: 2 }
        ];
        newQuestions[index].true_false_answer = true;
        newQuestions[index].answer_text = '';
        newQuestions[index].fill_blank_answer = '';
      } else if (value === 'short_answer' || value === 'essay') {
        newQuestions[index].choices = [];
        newQuestions[index].true_false_answer = true;
        newQuestions[index].fill_blank_answer = '';
        newQuestions[index].answer_text = '';
      } else if (value === 'fill_blank') {
        newQuestions[index].choices = [];
        newQuestions[index].true_false_answer = true;
        newQuestions[index].answer_text = '';
        newQuestions[index].fill_blank_answer = '';
      }
    } else {
      newQuestions[index][field] = value;
    }
    
    setQuestions(newQuestions);
  };

  const handleChoiceChange = (questionIndex, choiceIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices[choiceIndex][field] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    const newQuestion = {
      question_type: 'mcq',
      text: '',
      marks: 1,
      order: questions.length,
      true_false_answer: true,
      answer_text: '',
      fill_blank_answer: '',
      choices: [
        { text: '', is_correct: false, order: 0 },
        { text: '', is_correct: true, order: 1 },
        { text: '', is_correct: false, order: 2 }
      ]
    };
    setQuestions([...questions, newQuestion]);
    toast.success('Nouvelle question ajoutée');
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      toast.warning('Le test doit contenir au moins une question');
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    
    // Réorganiser les ordres
    newQuestions.forEach((q, idx) => {
      q.order = idx;
    });
    
    setQuestions(newQuestions);
    toast.info('Question supprimée');
  };

  const addChoice = (questionIndex) => {
    if (questions[questionIndex].question_type !== 'mcq') {
      toast.warning('Seules les questions à choix multiple peuvent avoir des choix supplémentaires');
      return;
    }
    
    const newQuestions = [...questions];
    const currentChoices = newQuestions[questionIndex].choices;
    
    // Assurer qu'au moins un choix est correct
    const hasCorrectChoice = currentChoices.some(c => c.is_correct);
    
    newQuestions[questionIndex].choices = [
      ...currentChoices,
      { 
        text: '', 
        is_correct: !hasCorrectChoice, // Si aucun choix correct, celui-ci le sera
        order: currentChoices.length 
      }
    ];
    
    setQuestions(newQuestions);
  };

  const removeChoice = (questionIndex, choiceIndex) => {
    const newQuestions = [...questions];
    const choices = newQuestions[questionIndex].choices;
    
    if (choices.length <= 2) {
      toast.warning('Une question doit avoir au moins 2 choix');
      return;
    }
    
    // Vérifier si on supprime le dernier choix correct
    const correctChoices = choices.filter(c => c.is_correct);
    const removingCorrect = choices[choiceIndex].is_correct;
    
    if (removingCorrect && correctChoices.length === 1) {
      toast.warning('La question doit avoir au moins une réponse correcte');
      return;
    }
    
    newQuestions[questionIndex].choices = choices.filter((_, i) => i !== choiceIndex);
    
    // Réorganiser les ordres
    newQuestions[questionIndex].choices.forEach((choice, idx) => {
      choice.order = idx;
    });
    
    setQuestions(newQuestions);
  };

  const validateForm = () => {
    console.log('Validation du formulaire...');
    
    // Validation du test
    if (!testData.title.trim()) {
      toast.error('Le titre du test est requis');
      return false;
    }
    
    if (!testData.subject) {
      toast.error('Veuillez sélectionner une matière');
      return false;
    }
    
    if (testData.duration < 1) {
      toast.error('La durée doit être d\'au moins 1 minute');
      return false;
    }
    
    if (testData.total_marks < 1) {
      toast.error('Le total des points doit être positif');
      return false;
    }
    
    if (testData.passing_marks > testData.total_marks) {
      toast.error('La note de passage ne peut pas être supérieure au total des points');
      return false;
    }
    
    // Validation des dates
    if (!testData.start_time || !testData.end_time) {
      toast.error('Les dates de début et fin sont requises');
      return false;
    }
    
    const startTime = new Date(testData.start_time);
    const endTime = new Date(testData.end_time);
    
    if (startTime >= endTime) {
      toast.error('La date de fin doit être après la date de début');
      return false;
    }

    // Validation des questions
    if (questions.length === 0) {
      toast.error('Le test doit contenir au moins une question');
      return false;
    }
    
    let totalMarks = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.text.trim()) {
        toast.error(`La question ${i + 1} ne peut pas être vide`);
        return false;
      }
      
      if (q.marks < 0) {
        toast.error(`Les points de la question ${i + 1} ne peuvent pas être négatifs`);
        return false;
      }
      
      totalMarks += q.marks || 0;
      
      // Validation selon le type de question
      switch (q.question_type) {
        case 'mcq':
          // Vérifier qu'il y a au moins 2 choix
          if (q.choices.length < 2) {
            toast.error(`La question ${i + 1} doit avoir au moins 2 choix`);
            return false;
          }
          
          // Vérifier qu'au moins un choix est correct
          const hasCorrectAnswer = q.choices.some(c => c.is_correct);
          if (!hasCorrectAnswer) {
            toast.error(`La question ${i + 1} doit avoir au moins une réponse correcte`);
            return false;
          }
          
          // Vérifier que tous les choix sont remplis
          const emptyChoices = q.choices.filter(c => !c.text.trim());
          if (emptyChoices.length > 0) {
            toast.error(`Tous les choix de la question ${i + 1} doivent être remplis`);
            return false;
          }
          
          // Vérifier qu'il n'y a pas de doublons
          const choiceTexts = q.choices.map(c => c.text.trim().toLowerCase());
          const uniqueTexts = [...new Set(choiceTexts)];
          if (choiceTexts.length !== uniqueTexts.length) {
            toast.error(`La question ${i + 1} contient des choix en double`);
            return false;
          }
          break;
          
        case 'true_false':
          // Vérifier que true_false_answer est défini
          if (q.true_false_answer === undefined) {
            toast.error(`La question ${i + 1} doit avoir une réponse correcte (Vrai/Faux)`);
            return false;
          }
          break;
          
        case 'short_answer':
        case 'essay':
          // Pour ces types, on peut juste vérifier que la question n'est pas vide
          break;
          
        case 'fill_blank':
          // Vérifier qu'il y a une réponse pour remplir les blancs
          if (!q.fill_blank_answer || !q.fill_blank_answer.trim()) {
            toast.error(`La question ${i + 1} doit avoir une réponse pour remplir les blancs`);
            return false;
          }
          break;
      }
    }

    // Vérifier que le total des points des questions ne dépasse pas le total du test
    if (totalMarks > testData.total_marks) {
      toast.error(`Le total des points des questions (${totalMarks}) dépasse le total du test (${testData.total_marks})`);
      return false;
    }

    console.log('✅ Formulaire validé avec succès');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
  
    try {
      setLoading(true);
      console.log('🚀 Début de la création du test...');
  
      // 1. Créer le quiz avec l'endpoint simplifié
      const quizData = {
        title: testData.title,
        subject: parseInt(testData.subject, 10),
        quiz_type: testData.quiz_type,
        description: testData.description || "",
        instructions: testData.instructions || "",
        duration: parseInt(testData.duration, 10),
        total_marks: parseInt(testData.total_marks, 10),
        passing_marks: parseInt(testData.passing_marks, 10),
        start_time: new Date(testData.start_time).toISOString(),
        end_time: new Date(testData.end_time).toISOString(),
      };
  
      console.log('📦 Données du quiz:', quizData);
      
      // Utiliser la route simplifiée
      const quizResponse = await api.post('/tests/simple/create-quiz/', quizData);
      const quizId = quizResponse.data.quiz_id;
      console.log('✅ Quiz créé, ID:', quizId);
  
      // 2. Créer les questions
      let questionCreationErrors = [];
      
      for (const [index, question] of questions.entries()) {
        try {
          const questionData = {
            quiz: quizId,
            question_type: question.question_type,
            text: question.text,
            marks: question.marks || 1,
            order: index
          };
  
          console.log(`📝 Création question ${index + 1}:`, questionData);
          
          // Utiliser la nouvelle route simplifiée pour les questions
          const questionResponse = await api.post('/tests/simple/create-question/', questionData);
          const questionId = questionResponse.data.question_id;
          console.log(`✅ Question ${index + 1} créée, ID:`, questionId);
  
          // Créer les choix si nécessaire (MCQ)
          if (question.question_type === 'mcq' && question.choices && question.choices.length > 0) {
            console.log(`   Création des choix pour la question ${index + 1}...`);
            
            for (const [choiceIndex, choice] of question.choices.entries()) {
              try {
                const choiceData = {
                  question: questionId,
                  text: choice.text,
                  is_correct: choice.is_correct,
                  order: choiceIndex
                };
                
                console.log(`   📝 Création choix ${choiceIndex + 1}:`, choiceData);
                
                // Utiliser la route standard pour les choix
                await api.post('/tests/choices/', choiceData);
                console.log(`   ✅ Choix ${choiceIndex + 1} créé`);
              } catch (choiceError) {
                console.error(`   ❌ Erreur création choix ${choiceIndex + 1}:`, choiceError.message);
              }
            }
          }
  
        } catch (questionError) {
          console.error(`❌ Erreur création question ${index + 1}:`, questionError.message);
          console.error('Détails:', questionError.response?.data);
          
          let errorDetail = questionError.message;
          if (questionError.response?.data) {
            if (typeof questionError.response.data === 'string') {
              errorDetail = questionError.response.data;
            } else if (typeof questionError.response.data === 'object') {
              errorDetail = JSON.stringify(questionError.response.data, null, 2);
            }
          }
          
          questionCreationErrors.push(`Question ${index + 1}: ${errorDetail}`);
        }
      }
  
      if (questionCreationErrors.length > 0) {
        toast.warning(`Le test a été créé mais certaines questions ont des erreurs: ${questionCreationErrors.join(', ')}`);
      } else {
        toast.success('✅ Test créé avec succès !');
      }
      
      setTimeout(() => navigate('/teacher/tests'), 1500);
  
    } catch (error) {
      console.error('❌ Erreur création test:', error);
      
      // Message d'erreur détaillé
      if (error.response) {
        console.error('📋 Erreur details:', error.response.data);
        
        let errorMessage = 'Erreur création test: ';
        if (error.response.data) {
          if (typeof error.response.data === 'object') {
            if (error.response.data.error) {
              errorMessage = error.response.data.error;
            } else if (error.response.data.detail) {
              errorMessage = error.response.data.detail;
            } else {
              errorMessage = JSON.stringify(error.response.data);
            }
          } else {
            errorMessage = error.response.data;
          }
        }
        
        toast.error(errorMessage);
      } else if (error.request) {
        toast.error('Impossible de contacter le serveur');
      } else {
        toast.error('Erreur: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const questionTypes = [
    { value: 'mcq', label: 'Choix multiple' },
    { value: 'true_false', label: 'Vrai/Faux' },
    { value: 'short_answer', label: 'Réponse courte' },
    { value: 'essay', label: 'Dissertation' },
    { value: 'fill_blank', label: 'Remplir les blancs' }
  ];

  const quizTypes = [
    { value: 'quiz', label: 'Quiz' },
    { value: 'exam', label: 'Examen' },
    { value: 'assignment', label: 'Devoir' },
    { value: 'test', label: 'Test' }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/teacher/tests')}
          sx={{ mb: 2 }}
        >
          Retour
        </Button>
        <Typography variant="h3" fontWeight={700} sx={{ color: '#e53935', mb: 1 }}>
          ✏️ Créer un Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configurez votre test et ajoutez des questions
        </Typography>
      </Box>

      {/* Informations du test */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment /> Informations du Test
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre du test *"
                value={testData.title}
                onChange={(e) => handleTestDataChange('title', e.target.value)}
                required
                helperText="Donnez un titre clair à votre test"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Matière *</InputLabel>
                <Select
                  value={testData.subject || ''}
                  label="Matière *"
                  onChange={(e) => handleTestDataChange('subject', e.target.value)}
                  MenuProps={{
                    disablePortal: true,
                  }}
                >
                  {subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <MenuItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Chargement des matières...</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type de test</InputLabel>
                <Select
                  value={testData.quiz_type}
                  label="Type de test"
                  onChange={(e) => handleTestDataChange('quiz_type', e.target.value)}
                >
                  {quizTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={testData.description}
                onChange={(e) => handleTestDataChange('description', e.target.value)}
                helperText="Décrivez brièvement l'objectif du test"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Instructions"
                value={testData.instructions}
                onChange={(e) => handleTestDataChange('instructions', e.target.value)}
                helperText="Instructions spécifiques pour les étudiants"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Durée (minutes) *"
                value={testData.duration || 0}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 0 : parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    handleTestDataChange('duration', numValue);
                  }
                }}
                InputProps={{
                  inputProps: { min: 1 },
                  startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} />
                }}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Total des points *"
                value={testData.total_marks || 0}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 0 : parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    handleTestDataChange('total_marks', numValue);
                  }
                }}
                InputProps={{
                  inputProps: { min: 1 },
                  startAdornment: <Grade sx={{ mr: 1, color: 'action.active' }} />
                }}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Note de passage *"
                value={testData.passing_marks || 0}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 0 : parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    handleTestDataChange('passing_marks', numValue);
                  }
                }}
                InputProps={{
                  inputProps: { min: 0, max: testData.total_marks },
                  startAdornment: <CheckBox sx={{ mr: 1, color: 'action.active' }} />
                }}
                helperText={`/${testData.total_marks}`}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Date/Heure de début *"
                value={testData.start_time}
                onChange={(e) => handleTestDataChange('start_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Date/Heure de fin *"
                value={testData.end_time}
                onChange={(e) => handleTestDataChange('end_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <School /> Questions ({questions.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={addQuestion}
              sx={{ bgcolor: '#e53935' }}
            >
              Ajouter une question
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {questions.map((question, qIndex) => (
              <Paper key={qIndex} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Chip 
                    label={`Question ${qIndex + 1}`} 
                    color={question.question_type === 'mcq' ? 'primary' : 
                           question.question_type === 'true_false' ? 'secondary' : 
                           question.question_type === 'short_answer' ? 'info' :
                           question.question_type === 'essay' ? 'warning' : 'success'} 
                  />
                  <IconButton
                    onClick={() => removeQuestion(qIndex)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Énoncé de la question *"
                      value={question.text}
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={question.question_type}
                        label="Type"
                        onChange={(e) => handleQuestionChange(qIndex, 'question_type', e.target.value)}
                      >
                        {questionTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Points *"
                      value={question.marks || 0}
                      onChange={(e) => {
                        const value = e.target.value;
                        const numValue = value === '' ? 0 : parseInt(value, 10);
                        if (!isNaN(numValue)) {
                          handleQuestionChange(qIndex, 'marks', numValue);
                        }
                      }}
                      InputProps={{
                        inputProps: { min: 0 }
                      }}
                    />
                  </Grid>
                </Grid>

                {/* Choix pour les questions à choix multiple */}
                {question.question_type === 'mcq' && (
                  <Box mt={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Choix de réponses ({question.choices.length})
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() => addChoice(qIndex)}
                      >
                        Ajouter un choix
                      </Button>
                    </Box>

                    <Stack spacing={2}>
                      {question.choices.map((choice, cIndex) => (
                        <Box key={cIndex} display="flex" gap={1} alignItems="center">
                          <RadioButtonChecked
                            sx={{
                              color: choice.is_correct ? '#4caf50' : 'action.disabled',
                              cursor: 'pointer',
                              '&:hover': { color: choice.is_correct ? '#2e7d32' : '#757575' }
                            }}
                            onClick={() => {
                              const newQuestions = [...questions];
                              // Si on clique sur un choix incorrect, le marquer comme correct
                              // et déselectionner les autres (pour radio button behavior)
                              if (!choice.is_correct) {
                                newQuestions[qIndex].choices.forEach(c => {
                                  c.is_correct = false;
                                });
                              }
                              newQuestions[qIndex].choices[cIndex].is_correct = !choice.is_correct;
                              setQuestions(newQuestions);
                            }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label={`Choix ${cIndex + 1}${choice.is_correct ? ' (Correct)' : ''}`}
                            value={choice.text}
                            onChange={(e) => handleChoiceChange(qIndex, cIndex, 'text', e.target.value)}
                            required
                            InputProps={{
                              style: { 
                                backgroundColor: choice.is_correct ? '#e8f5e9' : 'inherit'
                              }
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeChoice(qIndex, cIndex)}
                            color="error"
                            disabled={question.choices.length <= 2}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      💡 Cliquez sur l'icône radio pour marquer comme réponse correcte
                    </Typography>
                  </Box>
                )}

                {/* Interface pour les questions Vrai/Faux */}
                {question.question_type === 'true_false' && (
                  <Box mt={3}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Réponse correcte
                    </Typography>
                    <FormControl fullWidth>
                      <RadioGroup
                        value={question.true_false_answer ? 'true' : 'false'}
                        onChange={(e) => handleQuestionChange(qIndex, 'true_false_answer', e.target.value)}
                      >
                        <FormControlLabel value="true" control={<Radio />} label="Vrai" />
                        <FormControlLabel value="false" control={<Radio />} label="Faux" />
                      </RadioGroup>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      💡 Sélectionnez la réponse correcte
                    </Typography>
                  </Box>
                )}

                {/* Interface pour les réponses courtes et dissertations */}
                {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                  <Box mt={3}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {question.question_type === 'short_answer' ? 'Réponse modèle (optionnel)' : 'Instructions de correction'}
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={question.question_type === 'short_answer' ? 2 : 4}
                      label={question.question_type === 'short_answer' ? 'Réponse attendue (pour référence)' : 'Critères de correction'}
                      value={question.answer_text || ''}
                      onChange={(e) => handleQuestionChange(qIndex, 'answer_text', e.target.value)}
                      helperText={question.question_type === 'short_answer' 
                        ? 'La réponse correcte pour référence (optionnel)' 
                        : 'Décrivez les critères de correction pour cette dissertation'}
                    />
                  </Box>
                )}

                {/* Interface pour remplir les blancs */}
                {question.question_type === 'fill_blank' && (
                  <Box mt={3}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Réponse pour remplir les blancs
                    </Typography>
                    <TextField
                      fullWidth
                      label="Réponse correcte *"
                      value={question.fill_blank_answer || ''}
                      onChange={(e) => handleQuestionChange(qIndex, 'fill_blank_answer', e.target.value)}
                      required
                      helperText="La réponse correcte pour remplir le(s) blanc(s)"
                    />
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Résumé */}
      <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Résumé du test
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Questions</Typography>
              <Typography variant="h6">{questions.length}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Points totaux</Typography>
              <Typography variant="h6">
                {questions.reduce((sum, q) => sum + (q.marks || 0), 0)} / {testData.total_marks || 0}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Note de passage</Typography>
              <Typography variant="h6">{testData.passing_marks || 0} points</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Durée</Typography>
              <Typography variant="h6">{testData.duration || 0} min</Typography>
            </Grid>
          </Grid>
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Types de questions: {questions.filter(q => q.question_type === 'mcq').length} MCQ, 
              {questions.filter(q => q.question_type === 'true_false').length} Vrai/Faux, 
              {questions.filter(q => q.question_type === 'short_answer').length} Réponses courtes, 
              {questions.filter(q => q.question_type === 'essay').length} Dissertations, 
              {questions.filter(q => q.question_type === 'fill_blank').length} Remplir les blancs
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Actions */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate('/teacher/tests')}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={loading || !testData.subject}
          sx={{ 
            bgcolor: '#e53935',
            px: 4,
            '&:hover': { bgcolor: '#c62828' }
          }}
        >
          {loading ? 'Création en cours...' : 'Créer le test'}
        </Button>
      </Box>
    </Container>
  );
}