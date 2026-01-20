// src/pages/student/StudentSchedule.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Typography, Paper, Box, Grid,
  Card, CardContent, Alert, LinearProgress,
  Chip, Divider, CircularProgress, Avatar,
  IconButton, Tooltip, Accordion, AccordionSummary,
  AccordionDetails, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button
} from '@mui/material';
import {
  School, Person, Email, CalendarMonth,
  AccessTime, Book, LocationOn,
  ExpandMore, Refresh, Download,
  Today, Schedule, History as HistoryIcon,
  KeyboardArrowRight, KeyboardArrowDown,
  CheckCircle, Error
} from '@mui/icons-material';

export default function StudentSchedule() {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudentSchedule();
    fetchStudentInfo();
  }, []);

  const fetchStudentInfo = async () => {
    try {
      const res = await api.get('/accounts/me/');
      if (res.data.success) {
        setStudentInfo(res.data.user);
      }
    } catch (err) {
      console.error('Erreur chargement info étudiant:', err);
    }
  };

  const fetchStudentSchedule = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Début récupération emploi étudiant...');
      
      // OPTION 1: Utiliser l'endpoint dédié aux étudiants
      const res = await api.get('/schedule/student/my-schedule/');
      
      console.log('📊 Réponse API:', res.data);
      
      if (res.data.success) {
        console.log('✅ Données emploi reçues:', res.data.data);
        setSchedule(res.data.data);
        
        if (res.data.data.has_schedule && res.data.data.time_slots?.length > 0) {
          toast.success(`✅ Emploi du temps chargé (${res.data.data.time_slots.length} créneaux)`);
        } else if (res.data.data.has_schedule === false) {
          toast.info('ℹ️ Votre emploi du temps est en cours de préparation');
        }
      } else {
        setError(res.data.error || 'Erreur inconnue');
        toast.error(`❌ ${res.data.error || 'Erreur chargement emploi'}`);
      }
      
    } catch (err) {
      console.error('❌ ERREUR API:', err);
      console.error('❌ Réponse erreur:', err.response?.data);
      
      // OPTION 2: Fallback - utiliser l'endpoint générique
      if (err.response?.status === 404 || err.response?.status === 403) {
        try {
          console.log('🔄 Tentative avec endpoint générique...');
          const fallbackRes = await api.get('/schedule/my-schedule/');
          
          if (fallbackRes.data.success) {
            console.log('✅ Données via fallback:', fallbackRes.data);
            setSchedule(fallbackRes.data.data);
          } else {
            setError('Endpoint non disponible');
          }
        } catch (fallbackErr) {
          console.error('❌ Erreur fallback:', fallbackErr);
          setError(`Erreur: ${fallbackErr.response?.data?.error || 'Serveur indisponible'}`);
        }
      } else {
        setError(`Erreur ${err.response?.status || 'connexion'}: ${err.response?.data?.error || 'Vérifiez votre connexion'}`);
      }
      
      toast.error('Erreur lors du chargement de votre emploi du temps');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    const hours = (endTime - startTime) / (1000 * 60 * 60);
    return hours.toFixed(1);
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

  const DayScheduleCard = ({ day, slots, color }) => {
    const hasSlots = slots && slots.length > 0;
    
    return (
      <Paper 
        sx={{ 
          mb: 2, 
          borderLeft: `4px solid ${color}`,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 2
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: `${color}15`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: `${color}25` }
          }}
          onClick={() => setExpandedDay(expandedDay === day ? null : day)}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              bgcolor: color, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Typography color="white" fontWeight="bold">
                {day.substring(0, 1)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="600">
                {day}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {slots.length} cours programmé(s)
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label={`${slots.length} cours`} 
              sx={{ 
                bgcolor: hasSlots ? `${color}30` : '#e0e0e0',
                color: hasSlots ? color : '#757575',
                fontWeight: 500
              }} 
            />
            {expandedDay === day ? 
              <KeyboardArrowDown sx={{ color: color }} /> : 
              <KeyboardArrowRight sx={{ color: color }} />
            }
          </Box>
        </Box>
        
        {expandedDay === day && (
          <Box sx={{ p: 2 }}>
            {hasSlots ? (
              <Grid container spacing={2}>
                {slots.map((slot, index) => {
                  const duration = calculateDuration(slot.start_time, slot.end_time);
                  
                  return (
                    <Grid item xs={12} key={index}>
                      <Paper 
                        sx={{ 
                          p: 2.5,
                          borderRadius: 2,
                          borderLeft: `4px solid ${color}`,
                          bgcolor: '#fafafa',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: '#f5f5f5',
                            transform: 'translateX(4px)',
                            boxShadow: 3
                          }
                        }}
                      >
                        <Grid container alignItems="center" spacing={2}>
                          <Grid item xs={12} md={2}>
                            <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                Horaire
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1} justifyContent={{ xs: 'flex-start', md: 'center' }}>
                                <AccessTime sx={{ color: color, fontSize: 20 }} />
                                <Typography variant="h5" fontWeight="600" color={color}>
                                  {formatTime(slot.start_time)}
                                </Typography>
                                <Typography variant="body1" color="textSecondary" mx={1}>-</Typography>
                                <Typography variant="h6" fontWeight="500">
                                  {formatTime(slot.end_time)}
                                </Typography>
                              </Box>
                              <Chip 
                                label={`${duration}h`} 
                                size="small" 
                                sx={{ 
                                  bgcolor: `${color}20`, 
                                  color: color,
                                  fontWeight: '600',
                                  mt: 1
                                }} 
                              />
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={1}>
                            <Divider orientation="vertical" sx={{ height: '60px', display: { xs: 'none', md: 'block' } }} />
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box display="flex" alignItems="flex-start" gap={2}>
                              <Book sx={{ color: color, fontSize: 24, mt: 0.5 }} />
                              <Box>
                                <Typography variant="h6" fontWeight="600" gutterBottom>
                                  {slot.subject_name}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                  <Chip 
                                    label="Matière" 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ borderColor: color, color: color }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={1}>
                            <Divider orientation="vertical" sx={{ height: '60px', display: { xs: 'none', md: 'block' } }} />
                          </Grid>
                          
                          <Grid item xs={12} md={3}>
                            <Box display="flex" alignItems="flex-start" gap={2}>
                              <Person sx={{ color: '#9c27b0', fontSize: 24, mt: 0.5 }} />
                              <Box>
                                <Typography variant="subtitle1" fontWeight="500" gutterBottom>
                                  {slot.teacher_name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  Enseignant
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LocationOn sx={{ color: '#ed6c02', fontSize: 20 }} />
                              <Box>
                                <Typography variant="subtitle1" fontWeight="500">
                                  {slot.classroom || 'Salle à définir'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  Salle de classe
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ mt: 1, borderRadius: 2 }}>
                Aucun cours programmé pour ce jour
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    );
  };

  const organizeSlotsByDay = (slots) => {
    const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const organized = {};
    
    daysOrder.forEach(day => {
      organized[day] = [];
    });
    
    if (slots && Array.isArray(slots)) {
      slots.forEach(slot => {
        const day = slot.day_display || slot.day;
        if (day && organized[day] !== undefined) {
          organized[day].push(slot);
        } else {
          // Gérer les jours en anglais
          const dayMapping = {
            'Monday': 'Lundi',
            'Tuesday': 'Mardi',
            'Wednesday': 'Mercredi',
            'Thursday': 'Jeudi',
            'Friday': 'Vendredi'
          };
          if (dayMapping[day]) {
            organized[dayMapping[day]].push(slot);
          }
        }
      });
      
      // Trier par heure
      daysOrder.forEach(day => {
        organized[day].sort((a, b) => {
          return a.start_time.localeCompare(b.start_time);
        });
      });
    }
    
    return organized;
  };

  const exportSchedule = () => {
    if (!schedule) return;
    
    const data = {
      student: studentInfo,
      schedule: schedule,
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emploi-du-temps-${studentInfo?.username || 'etudiant'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Emploi du temps exporté !');
  };

  const getCurrentDaySchedule = () => {
    if (!schedule?.schedule_by_day) return null;
    
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
    const todayIndex = days.indexOf(today);
    
    if (todayIndex === -1 || !schedule.schedule_by_day[days[todayIndex]]) {
      return null;
    }
    
    return {
      day: days[todayIndex],
      slots: schedule.schedule_by_day[days[todayIndex]]
    };
  };

  const todaySchedule = getCurrentDaySchedule();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" color="primary">
          Chargement de votre emploi du temps...
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
          Veuillez patienter quelques instants
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: '#1976d2', color: 'white', boxShadow: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h2" fontWeight="bold" gutterBottom>
              🗓️ Mon Emploi du Temps
            </Typography>
            <Typography variant="h5">
              Suivez votre programme académique
            </Typography>
          </Box>
          <Tooltip title="Rafraîchir">
            <IconButton 
              onClick={fetchStudentSchedule} 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }}
              size="large"
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Informations étudiant */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 80, height: 80, bgcolor: '#1976d2', fontSize: '2rem' }}>
              {studentInfo?.first_name?.[0] || studentInfo?.username?.[0] || 'E'}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" fontWeight="600" gutterBottom>
              {studentInfo?.first_name} {studentInfo?.last_name}
            </Typography>
            <Box display="flex" gap={3} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={1}>
                <Email fontSize="small" color="action" />
                <Typography variant="body1">{studentInfo?.email}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <School fontSize="small" color="action" />
                <Typography variant="body1">
                  Classe: <strong>{schedule?.class_name || 'Non assigné'}</strong>
                </Typography>
              </Box>
              {schedule?.updated_at && (
                <Box display="flex" alignItems="center" gap={1}>
                  <HistoryIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="textSecondary">
                    Mis à jour le {new Date(schedule.updated_at).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Tooltip title="Exporter mon emploi">
                <IconButton 
                  onClick={exportSchedule}
                  color="primary"
                  sx={{ 
                    bgcolor: '#e3f2fd',
                    '&:hover': { bgcolor: '#bbdefb' }
                  }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Aujourd'hui (si des cours) */}
      {todaySchedule && todaySchedule.slots.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2, border: '2px solid #4caf50' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Today sx={{ fontSize: 32, color: '#4caf50' }} />
            <Typography variant="h5" fontWeight="600" color="#2e7d32">
              📅 Aujourd'hui ({todaySchedule.day})
            </Typography>
          </Box>
          
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            Vous avez {todaySchedule.slots.length} cours prévu(s) aujourd'hui
          </Alert>
          
          <Grid container spacing={2}>
            {todaySchedule.slots.map((slot, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Paper sx={{ p: 2, borderLeft: '4px solid #4caf50', height: '100%' }}>
                  <Typography variant="h6" color="#2e7d32" gutterBottom>
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="500">
                    {slot.subject_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Avec {slot.teacher_name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2">
                      Salle {slot.classroom}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Emploi du temps complet OU message d'erreur */}
      {error ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Error sx={{ fontSize: 60, color: '#f44336', mb: 2 }} />
          <Typography variant="h5" color="error" gutterBottom>
            Impossible de charger votre emploi du temps
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
            <Typography variant="body2">
              Raisons possibles :
              <ul>
                <li>Votre classe n'a pas encore d'emploi du temps</li>
                <li>Vous n'êtes pas encore assigné à une classe</li>
                <li>L'administration est en train de préparer votre emploi</li>
              </ul>
            </Typography>
          </Alert>
        </Paper>
      ) : schedule?.has_schedule && schedule?.time_slots?.length > 0 ? (
        <>
          {/* Statistiques */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 3 }}>
              📊 Vue d'ensemble
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                  <Typography variant="h4" color="#1976d2" fontWeight="600">
                    {schedule.total_slots || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Créneaux total
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="h4" color="#2e7d32" fontWeight="600">
                    {Object.keys(schedule.schedule_by_day || {}).filter(day => 
                      schedule.schedule_by_day[day]?.length > 0
                    ).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Jours avec cours
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                  <Typography variant="h4" color="#9c27b0" fontWeight="600">
                    {new Set(schedule.time_slots?.map(s => s.subject_name)).size}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Matières différentes
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="h4" color="#ed6c02" fontWeight="600">
                    {schedule.time_slots?.reduce((acc, slot) => {
                      return acc + parseFloat(calculateDuration(slot.start_time, slot.end_time));
                    }, 0).toFixed(1)}h
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Heures totales
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          {/* Emploi du temps détaillé */}
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h4" sx={{ color: '#1976d2' }}>
                <CalendarMonth sx={{ mr: 1, verticalAlign: 'middle' }} />
                Emploi du temps hebdomadaire
              </Typography>
              <Chip 
                icon={<CheckCircle />} 
                label="Actif" 
                color="success" 
                variant="outlined" 
              />
            </Box>
            
            {(() => {
              const slotsByDay = organizeSlotsByDay(schedule.time_slots);
              const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
              
              return (
                <Box>
                  {days.map(day => (
                    <DayScheduleCard
                      key={day}
                      day={day}
                      slots={slotsByDay[day] || []}
                      color={getDayColor(day)}
                    />
                  ))}
                </Box>
              );
            })()}
          </Paper>
        </>
      ) : (
        // Aucun emploi du temps disponible
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, boxShadow: 3 }}>
          <School sx={{ fontSize: 80, color: '#9e9e9e', mb: 3 }} />
          <Typography variant="h4" color="textSecondary" gutterBottom>
            Emploi du temps non disponible
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Votre emploi du temps est en cours de génération par l'administration.
            <br />
            Vous serez informé dès qu'il sera prêt. 🎓
          </Typography>
          
          <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto', borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Prochaines étapes :</strong>
              <ol style={{ textAlign: 'left', marginTop: 8 }}>
                <li>L'administration doit créer votre emploi du temps</li>
                <li>Vos enseignants seront assignés à vos matières</li>
                <li>Vous recevrez une notification quand tout sera prêt</li>
              </ol>
            </Typography>
          </Alert>
          
          <Button 
            variant="contained" 
            startIcon={<Refresh />} 
            onClick={fetchStudentSchedule}
            sx={{ mt: 4, px: 4 }}
          >
            Vérifier maintenant
          </Button>
        </Paper>
      )}

      {/* Debug panel (seulement en développement) */}
      {process.env.NODE_ENV === 'development' && (
        <Paper sx={{ p: 2, mt: 4, bgcolor: '#f5f5f5' }}>
          <Typography variant="caption" color="textSecondary">
            Debug: {JSON.stringify({
              hasSchedule: schedule?.has_schedule,
              slotsCount: schedule?.time_slots?.length,
              class: schedule?.class_name
            })}
          </Typography>
        </Paper>
      )}
    </Container>
  );
}