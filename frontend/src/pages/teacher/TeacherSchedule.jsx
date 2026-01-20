// src/pages/teacher/TeacherSchedule.jsx - VERSION CORRIGÉE ET COMPLÈTE
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Container, Typography, Paper, Grid, Chip,
  Box, Card, CardContent, Divider, Table,
  TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, CircularProgress,
  Alert, LinearProgress, IconButton
} from '@mui/material';
import {
  CalendarMonth, Schedule, School, Download,
  AccessTime, LocationOn, Person, Book,
  Today, ExpandMore, ExpandLess, Print,
  Refresh, ArrowForward, EventNote
} from '@mui/icons-material';

export default function TeacherSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState({});
  const [todaysClasses, setTodaysClasses] = useState([]);
  const [statistics, setStatistics] = useState({
    totalHours: 0,
    totalSlots: 0,
    daysWithClasses: 0,
    maxHours: 20
  });

  useEffect(() => {
    fetchTeacherSchedule();
  }, []);

  const fetchTeacherSchedule = async () => {
    try {
      setLoading(true);
      // Route pour récupérer l'emploi du temps de l'enseignant
      const res = await api.get('/schedule/teacher/my-schedule/'); // Déjà correcte
      
      if (res.data && res.data.success) {
        const scheduleData = res.data.data || res.data;
        setSchedule(scheduleData);
        
        // Extraire les classes d'aujourd'hui
        extractTodaysClasses(scheduleData.time_slots || []);
        
        // Calculer les statistiques
        calculateStatistics(scheduleData);
        
        // Expand le jour actuel
        const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
        setExpandedDays({ [today]: true });
      } else {
        setSchedule(null);
      }
    } catch (err) {
      console.error('Erreur chargement emploi enseignant:', err);
      if (err.response?.status === 404) {
        toast.info('Votre emploi du temps est en cours de préparation');
      } else {
        toast.error('Erreur chargement emploi du temps');
      }
    } finally {
      setLoading(false);
    }
  };

  const extractTodaysClasses = (slots) => {
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
    const frenchToEnglishDays = {
      'Lundi': 'Monday',
      'Mardi': 'Tuesday',
      'Mercredi': 'Wednesday',
      'Jeudi': 'Thursday',
      'Vendredi': 'Friday'
    };
    
    const todayEnglish = frenchToEnglishDays[today] || today;
    
    const todaySlots = slots?.filter(slot => {
      const slotDay = slot.day_display || slot.day;
      return slotDay === today || slotDay === todayEnglish;
    }) || [];
    
    // Trier par heure
    todaySlots.sort((a, b) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    setTodaysClasses(todaySlots);
  };

  const calculateStatistics = (scheduleData) => {
    const slots = scheduleData.time_slots || [];
    
    // Calculer le total d'heures
    let totalHours = 0;
    const daysSet = new Set();
    
    slots.forEach(slot => {
      const duration = calculateDuration(slot.start_time, slot.end_time);
      totalHours += parseFloat(duration);
      
      const day = slot.day_display || slot.day;
      daysSet.add(day);
    });
    
    setStatistics({
      totalHours: parseFloat(totalHours.toFixed(1)),
      totalSlots: slots.length,
      daysWithClasses: daysSet.size,
      maxHours: scheduleData.max_hours || 20
    });
  };

  const toggleDay = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const exportSchedule = () => {
    if (!schedule) return;
    
    const data = JSON.stringify(schedule, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emploi-${user?.username || 'enseignant'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Emploi exporté !');
  };

  const printSchedule = () => {
    window.print();
  };

  const getDayColor = (day) => {
    const colors = {
      'Monday': '#1976d2',
      'Tuesday': '#2e7d32',
      'Wednesday': '#ed6c02',
      'Thursday': '#9c27b0',
      'Friday': '#d32f2f',
      'Lundi': '#1976d2',
      'Mardi': '#2e7d32',
      'Mercredi': '#ed6c02',
      'Jeudi': '#9c27b0',
      'Vendredi': '#d32f2f'
    };
    return colors[day] || '#616161';
  };

  const organizeSlotsByDay = (slots) => {
    const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const organized = {};
    
    // Initialiser tous les jours
    daysOrder.forEach(day => {
      organized[day] = [];
    });
    
    if (slots && Array.isArray(slots)) {
      slots.forEach(slot => {
        // Normaliser le nom du jour
        let day = slot.day_display || slot.day;
        const englishToFrench = {
          'Monday': 'Lundi',
          'Tuesday': 'Mardi',
          'Wednesday': 'Mercredi',
          'Thursday': 'Jeudi',
          'Friday': 'Vendredi'
        };
        
        if (englishToFrench[day]) {
          day = englishToFrench[day];
        }
        
        if (day && organized[day] !== undefined) {
          organized[day].push(slot);
        }
      });
      
      // Trier par heure pour chaque jour
      daysOrder.forEach(day => {
        organized[day].sort((a, b) => {
          const timeA = a.start_time || '00:00';
          const timeB = b.start_time || '00:00';
          return timeA.localeCompare(timeB);
        });
      });
    }
    
    return organized;
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      return (end - start) / (1000 * 60 * 60); // en heures
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h3" fontWeight="bold" color="#9c27b0" gutterBottom>
              <CalendarMonth sx={{ mr: 2, verticalAlign: 'middle', fontSize: 40 }} />
              Mon Emploi du Temps
            </Typography>
            <Typography variant="h6" color="textSecondary">
              {user?.first_name} {user?.last_name} • {user?.specialty?.name || user?.teacher_specialty || 'Enseignant'}
            </Typography>
          </Box>
          
          {schedule && (
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchTeacherSchedule}
                size="small"
              >
                Actualiser
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={exportSchedule}
                size="small"
              >
                Exporter
              </Button>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={printSchedule}
                size="small"
                sx={{ bgcolor: '#9c27b0' }}
              >
                Imprimer
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {schedule ? (
        <>
          {/* Statistiques */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                <Typography variant="h4" color="#1976d2" fontWeight="600">
                  {statistics.totalHours}h
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Heures totales
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(statistics.totalHours / statistics.maxHours) * 100} 
                  sx={{ mt: 2, height: 8, borderRadius: 4 }}
                  color={statistics.totalHours >= statistics.maxHours ? "error" : "primary"}
                />
                <Typography variant="caption" color="textSecondary">
                  {statistics.totalHours}/{statistics.maxHours}h
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                <Typography variant="h4" color="#9c27b0" fontWeight="600">
                  {statistics.totalSlots}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Créneaux
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                <Typography variant="h4" color="#2e7d32" fontWeight="600">
                  {statistics.daysWithClasses}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Jours de cours
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fff3e0' }}>
                <Typography variant="h4" color="#ed6c02" fontWeight="600">
                  {todaysClasses.length}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Cours aujourd'hui
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Carte d'aujourd'hui */}
          <Card sx={{ mb: 4, bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" sx={{ color: '#9c27b0' }}>
                  <Today sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Typography>
                <Chip 
                  label={`${todaysClasses.length} cours`} 
                  color="secondary"
                  size="medium"
                />
              </Box>

              {todaysClasses.length > 0 ? (
                <Grid container spacing={2}>
                  {todaysClasses.map((slot, index) => {
                    const duration = calculateDuration(slot.start_time, slot.end_time);
                    const day = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
                    
                    return (
                      <Grid item xs={12} md={6} lg={4} key={index}>
                        <Paper 
                          sx={{ 
                            p: 2.5,
                            height: '100%',
                            borderLeft: `4px solid ${getDayColor(day)}`,
                            bgcolor: 'white',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: 3
                            }
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Typography variant="h6" color={getDayColor(day)} fontWeight="600">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </Typography>
                            <Chip 
                              label={`${duration.toFixed(1)}h`}
                              size="small"
                              sx={{ 
                                bgcolor: `${getDayColor(day)}20`,
                                color: getDayColor(day),
                                fontWeight: '500'
                              }}
                            />
                          </Box>
                          
                          <Typography variant="h5" fontWeight="600" gutterBottom>
                            {slot.subject_name || 'Matière'}
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                              <School fontSize="small" sx={{ color: '#1976d2' }} />
                              <Typography variant="body1">
                                <strong>Classe:</strong> {slot.class_name || 'Non spécifié'}
                              </Typography>
                            </Box>
                            
                            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                              <LocationOn fontSize="small" sx={{ color: '#ed6c02' }} />
                              <Typography variant="body1">
                                <strong>Salle:</strong> {slot.classroom || 'À définir'}
                              </Typography>
                            </Box>
                            
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <EventNote fontSize="small" sx={{ color: '#2e7d32' }} />
                              <Typography variant="body2" color="textSecondary">
                                Durée: {duration.toFixed(1)} heures
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Alert severity="info">
                  Aucun cours programmé pour aujourd'hui.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Emploi du temps complet */}
          <Typography variant="h4" gutterBottom sx={{ color: '#9c27b0', mb: 3 }}>
            📅 Programme hebdomadaire complet
          </Typography>
          
          {(() => {
            const slotsByDay = organizeSlotsByDay(schedule.time_slots || []);
            const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
            
            return (
              <Box>
                {days.map(day => {
                  const daySlots = slotsByDay[day] || [];
                  const isExpanded = expandedDays[day];
                  const totalHours = daySlots.reduce((total, slot) => {
                    return total + calculateDuration(slot.start_time, slot.end_time);
                  }, 0);
                  
                  if (daySlots.length === 0) return null;
                  
                  return (
                    <Paper 
                      key={day}
                      sx={{ 
                        mb: 3, 
                        borderLeft: `4px solid ${getDayColor(day)}`,
                        overflow: 'hidden',
                        transition: 'all 0.3s'
                      }}
                    >
                      <Box
                        sx={{
                          p: 2.5,
                          bgcolor: `${getDayColor(day)}10`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: `${getDayColor(day)}20` }
                        }}
                        onClick={() => toggleDay(day)}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            bgcolor: getDayColor(day),
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <Typography color="white" fontWeight="bold" fontSize="1.1rem">
                              {day.substring(0, 1)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="h5" fontWeight="600">
                              {day}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {totalHours.toFixed(1)} heures • {daySlots.length} cours
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={2}>
                          <Chip 
                            label={`${totalHours.toFixed(1)}h`}
                            size="medium"
                            sx={{ 
                              bgcolor: `${getDayColor(day)}30`,
                              color: getDayColor(day),
                              fontWeight: '500'
                            }} 
                          />
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      </Box>
                      
                      {isExpanded && (
                        <Box sx={{ p: 3 }}>
                          <TableContainer>
                            <Table>
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                                  <TableCell><strong>Heure</strong></TableCell>
                                  <TableCell><strong>Matière</strong></TableCell>
                                  <TableCell><strong>Classe</strong></TableCell>
                                  <TableCell><strong>Salle</strong></TableCell>
                                  <TableCell><strong>Durée</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {daySlots.map((slot, index) => {
                                  const duration = calculateDuration(slot.start_time, slot.end_time);
                                  
                                  return (
                                    <TableRow 
                                      key={index} 
                                      hover
                                      sx={{ 
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <TableCell>
                                        <Box>
                                          <Typography variant="h6" fontWeight="600" color={getDayColor(day)}>
                                            {formatTime(slot.start_time)}
                                          </Typography>
                                          <Typography variant="body2" color="textSecondary">
                                            à {formatTime(slot.end_time)}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                          <Book sx={{ color: getDayColor(day) }} />
                                          <Typography fontWeight="500">
                                            {slot.subject_name}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                          <School sx={{ color: '#1976d2' }} />
                                          <Typography>{slot.class_name}</Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                          <LocationOn sx={{ color: '#ed6c02' }} />
                                          <Typography>{slot.classroom}</Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={`${duration.toFixed(1)}h`}
                                          sx={{ 
                                            bgcolor: `${getDayColor(day)}20`,
                                            color: getDayColor(day),
                                            fontWeight: '500',
                                            fontSize: '0.9rem'
                                          }}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            );
          })()}
          
          {/* Si aucun jour n'a de cours */}
          {!schedule.time_slots || schedule.time_slots.length === 0 ? (
            <Alert severity="info" sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Aucun cours programmé
              </Typography>
              <Typography variant="body2">
                Votre emploi du temps est en cours de configuration par l'administration.
                <br />
                Vous serez informé lorsque vos cours seront programmés.
              </Typography>
            </Alert>
          ) : null}
        </>
      ) : (
        <Alert 
          severity="info" 
          sx={{ mt: 4 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchTeacherSchedule}
              startIcon={<Refresh />}
            >
              Réessayer
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            Emploi du temps non disponible
          </Typography>
          <Typography variant="body2">
            Votre emploi du temps est en cours de préparation.
            <br />
            Contactez l'administration si le problème persiste.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}