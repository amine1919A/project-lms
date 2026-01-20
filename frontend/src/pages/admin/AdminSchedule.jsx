// src/pages/admin/AdminSchedule.jsx → VERSION DESIGN PRO AMÉLIORÉE
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api, { extractArray, extractObject } from '../../services/api'; 
import {
  Container, Typography, Button, Select, MenuItem, FormControl,
  InputLabel, Box, Alert, LinearProgress, Card, Chip, Divider,
  Grid, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tab, Tabs, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, IconButton, Tooltip, Badge,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  AutoFixHigh, CheckCircle, School, SmartToy,
  CalendarMonth, Person, Schedule, Download,
  Visibility, Refresh, Warning, ExpandMore,
  Sync, BugReport, History,
  AutoAwesome, ReportProblem, Schedule as ScheduleIcon,
  AccessTime, LocationOn, Book,
  KeyboardArrowRight, KeyboardArrowDown
} from '@mui/icons-material';

export default function AdminSchedule() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [generateForAll, setGenerateForAll] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [history, setHistory] = useState([]);
  const [smartMode, setSmartMode] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [teacherScheduleDetails, setTeacherScheduleDetails] = useState([]);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [selectedTeacherSchedule, setSelectedTeacherSchedule] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  // Charger les données
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    await Promise.all([
      fetchClasses(),
      fetchAllSchedules(),
      fetchTeacherScheduleDetails(),
      checkForConflicts(),
      fetchHistory()
    ]);
  };

  const fetchClasses = async () => {
    try {
      console.log("Tentative de chargement des classes...");
      const res = await api.get('/classes/classes/');
      
      // CORRECTION : Extraire les classes
      const classesData = res.data?.results || res.data?.data || res.data || [];
      
      console.log("Classes chargées :", {
        raw: res.data,
        extracted: classesData,
        isArray: Array.isArray(classesData),
        count: Array.isArray(classesData) ? classesData.length : "Non-array"
      });
      
      if (!Array.isArray(classesData)) {
        console.error("❌ classesData n'est pas un tableau:", classesData);
        toast.error("Format de données classes incorrect");
        setClasses([]);
      } else {
        setClasses(classesData);
      }
    } catch (err) {
      console.error("ERREUR COMPLETE CLASSES :", err);
      console.error("Response :", err.response?.data);
      toast.error(`Impossible de charger les classes`);
    }
  };

  const fetchAllSchedules = async () => {
    try {
      const res = await api.get('/schedule/schedules/');
      setSchedules(res.data.schedules || []);
    } catch (err) {
      console.error('Erreur chargement emplois:', err);
      setSchedules([]);
    }
  };

  const fetchTeacherScheduleDetails = async () => {
    try {
      const res = await api.get('/schedule/teacher-schedules/');
      
      // Assurez-vous que c'est un tableau
      const data = res?.data;
      let teachersArray = [];
      
      if (Array.isArray(data)) {
        teachersArray = data;
      } else if (data && data.results && Array.isArray(data.results)) {
        teachersArray = data.results;
      } else if (data && data.data && Array.isArray(data.data)) {
        teachersArray = data.data;
      } else if (data && typeof data === 'object') {
        // Si c'est un objet unique, le mettre dans un tableau
        teachersArray = [data];
      }
      
      console.log("📊 Données enseignants:", {
        raw: data,
        processed: teachersArray,
        count: teachersArray.length
      });
      
      setTeacherScheduleDetails(teachersArray);
    } catch (err) {
      console.error('Erreur chargement détails enseignants:', err);
      setTeacherScheduleDetails([]);
    }
  };

  const checkForConflicts = async () => {
    setCheckingConflicts(true);
    setConflicts([]);
    setCheckingConflicts(false);
  };

  const fetchHistory = async () => {
    try {
      const mockHistory = [
        { id: 1, action: 'Génération', class: 'Classe A', date: new Date().toISOString(), user: 'Admin' },
        { id: 2, action: 'Mise à jour', class: 'Classe B', date: new Date(Date.now() - 86400000).toISOString(), user: 'Admin' },
      ];
      setHistory(mockHistory);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    }
  };

  const checkTeacherAvailability = async (classId) => {
    if (!classId) {
      toast.error("Sélectionnez une classe d'abord");
      return;
    }
    
    setCheckingAvailability(true);
    try {
      const res = await api.get(`/schedule/available-teachers/?class_id=${classId}`);
      
      if (res.data.success) {
        setAvailableTeachers(res.data.available_teachers);
        
        const availableCount = res.data.available_teachers.filter(t => t.available).length;
        const unavailableCount = res.data.available_teachers.filter(t => !t.available).length;
        
        toast.info(
          <div>
            <strong>Disponibilité des enseignants :</strong>
            <br />
            ✅ {availableCount} enseignants disponibles
            <br />
            ⚠️ {unavailableCount} enseignants non disponibles
          </div>
        );
      }
    } catch (err) {
      toast.error("Erreur vérification disponibilité");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const generateSchedule = async () => {
    if (generateForAll) {
      await generateAllSchedules();
      return;
    }

    if (!selectedClass) {
      toast.error("Choisissez une classe");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      try {
        const availabilityRes = await api.get(`/schedule/available-teachers/?class_id=${selectedClass}`);
        
        if (availabilityRes.data.success) {
          const availableCount = availabilityRes.data.available_teachers.filter(t => t.available).length;
          
          if (availableCount === 0) {
            toast.error(
              <div>
                <strong>Aucun enseignant disponible !</strong>
                <br />
                Tous les enseignants ont des emplois complets.
                <br />
                Veuillez libérer du temps ou choisir d'autres enseignants.
              </div>,
              { autoClose: 5000 }
            );
            setLoading(false);
            return;
          }
          
          const unavailableTeachers = availabilityRes.data.available_teachers
            .filter(t => !t.available)
            .map(t => `${t.name} (${t.message})`);
          
          if (unavailableTeachers.length > 0) {
            toast.warning(
              <div>
                <strong>{unavailableTeachers.length} enseignant(s) non disponible(s) :</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {unavailableTeachers.slice(0, 3).map((teacher, idx) => (
                    <li key={idx}>{teacher}</li>
                  ))}
                </ul>
                {unavailableTeachers.length > 3 && `... et ${unavailableTeachers.length - 3} autres`}
              </div>,
              { autoClose: 6000 }
            );
          }
        }
      } catch (availabilityErr) {
        console.warn("Erreur vérification disponibilité:", availabilityErr);
      }

      const res = await api.post('/schedule/generate-smart/', {
        class_id: parseInt(selectedClass),
        force_update: true
      });

      if (res.data.success) {
        const { data } = res.data;
        
        toast.success(
          <div>
            <strong>✅ Emploi généré avec succès !</strong>
            <br />
            {data.slots_created} créneaux créés
            <br />
            {data.teachers_updated || 0} enseignants programmés
          </div>
        );
        
        if (data.errors && data.errors.length > 0) {
          toast.warning(`⚠️ ${data.errors.length} avertissements`);
        }
        
        setSuccess(true);
        refreshAllData();
        
      } else {
        toast.error(`❌ ${res.data.error}`);
      }
    } catch (err) {
      console.error("ERREUR :", err.response?.data || err);
      toast.error("Erreur génération – vérifiez que vous êtes admin et que la classe a des matières avec enseignants disponibles");
    } finally {
      setLoading(false);
    }
  };

  const generateAllSchedules = async () => {
    setGenerateLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const classObj of classes) {
        try {
          const res = await api.post('/schedule/generate-smart/', {
            class_id: classObj.id,
            force_update: true
          });
          
          if (res.data.success) {
            successCount++;
          } else {
            errorCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (err) {
          errorCount++;
        }
      }
      
      toast.success(`✅ ${successCount} classes traitées avec succès`);
      
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} erreurs`);
      }
      
      refreshAllData();
      setSuccess(true);
      
    } catch (err) {
      toast.error("Erreur lors de la génération globale");
    } finally {
      setGenerateLoading(false);
    }
  };

  const autoFixConflicts = async () => {
    try {
      const res = await api.post('/schedule/auto-fix-conflicts/');
      
      if (res.data.success) {
        toast.success(`✅ ${res.data.message}`);
        await checkForConflicts();
        refreshAllData();
      } else {
        toast.error(`❌ ${res.data.error}`);
      }
    } catch (err) {
      toast.error("Erreur correction conflits");
    }
  };

  const viewScheduleDetails = async (scheduleId) => {
    try {
      const res = await api.get(`/schedule/schedules/${scheduleId}/`);
      setSelectedSchedule(res.data);
      setViewDialogOpen(true);
    } catch (err) {
      toast.error('Erreur chargement détails');
    }
  };

  const viewTeacherScheduleDetails = async (teacherId) => {
    try {
      const res = await api.get(`/schedule/teacher-schedules/${teacherId}/`);
      setSelectedTeacherSchedule(res.data);
      setTeacherDialogOpen(true);
    } catch (err) {
      toast.error('Erreur chargement emploi enseignant');
    }
  };

  const exportSchedule = (schedule) => {
    const data = JSON.stringify(schedule, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emploi-${schedule.class_name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Emploi exporté !');
  };

  const exportTeacherSchedule = (schedule) => {
    const data = JSON.stringify(schedule, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emploi-enseignant-${schedule.teacher_name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Emploi enseignant exporté !');
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

  const calculateTeacherHours = (schedule) => {
    if (!schedule || !schedule.time_slots) return 0;
    let totalHours = 0;
    schedule.time_slots.forEach(slot => {
      const start = new Date(`2000-01-01T${slot.start_time}`);
      const end = new Date(`2000-01-01T${slot.end_time}`);
      const hours = (end - start) / (1000 * 60 * 60);
      totalHours += hours;
    });
    return totalHours.toFixed(1);
  };

  // Fonction pour organiser les créneaux par jour (Lundi à Vendredi)
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
        }
      });
      
      // Trier les créneaux par heure de début pour chaque jour
      daysOrder.forEach(day => {
        organized[day].sort((a, b) => {
          return a.start_time.localeCompare(b.start_time);
        });
      });
    }
    
    return organized;
  };

  // Fonction pour formater l'heure
  const formatTime = (time) => {
    return time.substring(0, 5);
  };

  // Composant pour afficher un jour d'emploi du temps
  const DayScheduleCard = ({ day, slots, color }) => {
    const hasSlots = slots && slots.length > 0;
    
    return (
      <Paper 
        sx={{ 
          mb: 2, 
          borderLeft: `4px solid ${color}`,
          borderRadius: 1,
          overflow: 'hidden'
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
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="white" fontWeight="bold" fontSize="0.9rem">
                {day.substring(0, 1)}
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight="600">
              {day}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label={`${slots.length} cours`} 
              size="small" 
              sx={{ 
                bgcolor: hasSlots ? `${color}30` : '#e0e0e0',
                color: hasSlots ? color : '#757575'
              }} 
            />
            {expandedDay === day ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
          </Box>
        </Box>
        
        {expandedDay === day && (
          <Box sx={{ p: 2 }}>
            {hasSlots ? (
              <Grid container spacing={1}>
                {slots.map((slot, index) => {
                  const start = new Date(`2000-01-01T${slot.start_time}`);
                  const end = new Date(`2000-01-01T${slot.end_time}`);
                  const duration = ((end - start) / (1000 * 60 * 60)).toFixed(1);
                  
                  return (
                    <Grid item xs={12} key={index}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          mb: 1,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: 1,
                          bgcolor: '#fafafa',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: '#f5f5f5',
                            transform: 'translateX(2px)'
                          }
                        }}
                      >
                        <Grid container alignItems="center" spacing={2}>
                          <Grid item xs={2}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Heure
                              </Typography>
                              <Typography variant="h6" fontWeight="600" color={color}>
                                {formatTime(slot.start_time)}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                à {formatTime(slot.end_time)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={3}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Book fontSize="small" sx={{ color: color }} />
                              <div>
                                <Typography variant="subtitle1" fontWeight="500">
                                  {slot.subject_name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {duration}h • Salle {slot.classroom}
                                </Typography>
                              </div>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={4}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Person fontSize="small" sx={{ color: '#9c27b0' }} />
                              <div>
                                <Typography variant="subtitle2" fontWeight="500">
                                  {slot.teacher_name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  Enseignant
                                </Typography>
                              </div>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={3}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Chip 
                                label={`${duration}h`} 
                                size="small" 
                                sx={{ 
                                  bgcolor: `${color}20`, 
                                  color: color,
                                  fontWeight: '500'
                                }} 
                              />
                              <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                                Salle: {slot.classroom}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                Aucun cours programmé pour ce jour
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    );
  };

  // Composant pour afficher l'emploi du temps d'un enseignant par jour
  const TeacherDaySchedule = ({ day, slots, color }) => {
    const hasSlots = slots && slots.length > 0;
    
    if (!hasSlots) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            color: color,
            pb: 1,
            borderBottom: `2px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="white" fontWeight="bold" fontSize="0.8rem">
              {day.substring(0, 1)}
            </Typography>
          </Box>
          {day} • {slots.length} cours
        </Typography>
        
        <Grid container spacing={1}>
          {slots.map((slot, index) => {
            const start = new Date(`2000-01-01T${slot.start_time}`);
            const end = new Date(`2000-01-01T${slot.end_time}`);
            const duration = ((end - start) / (1000 * 60 * 60)).toFixed(1);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Paper 
                  sx={{ 
                    p: 2,
                    height: '100%',
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 1,
                    bgcolor: '#fafafa',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" color={color} fontWeight="600">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </Typography>
                    <Chip 
                      label={`${duration}h`} 
                      size="small" 
                      sx={{ 
                        bgcolor: `${color}20`, 
                        color: color,
                        fontWeight: '500'
                      }} 
                    />
                  </Box>
                  
                  <Typography variant="subtitle1" fontWeight="500" gutterBottom>
                    {slot.subject_name}
                  </Typography>
                  
                  <Box sx={{ mt: 1.5 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <School fontSize="small" sx={{ color: '#1976d2' }} />
                      <Typography variant="body2" fontWeight="500">
                        {slot.class_name}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOn fontSize="small" sx={{ color: '#ed6c02' }} />
                      <Typography variant="body2" color="textSecondary">
                        Salle {slot.classroom}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Typography variant="h2" fontWeight="bold" color="#1976d2" gutterBottom>
            🗓️ Gestion des Emplois du Temps
          </Typography>
          <Typography variant="h5" color="textSecondary">
            Système de planification académique
          </Typography>
        </Box>
        <Tooltip title="Rafraîchir toutes les données">
          <IconButton 
            onClick={refreshAllData} 
            color="primary"
            size="large"
            sx={{ 
              bgcolor: '#1976d2',
              color: 'white',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 4, boxShadow: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          centered
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': { py: 2, fontSize: '0.9rem', fontWeight: 500 }
          }}
        >
          <Tab icon={<AutoAwesome />} label="Génération" />
          <Tab icon={<School />} label={<Badge badgeContent={schedules.length} color="primary">Classes</Badge>} />
          <Tab icon={<Person />} label={<Badge badgeContent={teacherScheduleDetails.length} color="secondary">Enseignants</Badge>} />
          <Tab icon={<ReportProblem />} label={<Badge badgeContent={conflicts.length} color="error">Conflits</Badge>} />
          <Tab icon={<ScheduleIcon />} label="Disponibilité" />
          <Tab icon={<History />} label="Historique" />
        </Tabs>
      </Paper>

      {/* Tab 1: Génération */}
      {tabValue === 0 && (
        <Card sx={{ p: 4, mb: 4, boxShadow: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#1976d2' }}>
            <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
            Génération des Emplois du Temps
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Classe à programmer</InputLabel>
                <Select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  label="Classe à programmer"
                >
                  {classes.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        <School color="primary" />
                        <Box flex={1}>
                          <Typography fontWeight="bold">{c.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {c.subjects_count || 0} matières • {c.students_count || 0} étudiants
                          </Typography>
                        </Box>
                        {schedules.find(s => s.class_assigned === c.id) && (
                          <Chip label="Programmé" size="small" color="success" variant="outlined" />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ p: 2, bgcolor: '#f5f7fa', borderRadius: 2, mb: 3 }}>
                <FormControlLabel
                  control={<Switch checked={smartMode} onChange={(e) => setSmartMode(e.target.checked)} color="primary" />}
                  label="Mode Intelligent"
                />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: 0.5 }}>
                  Synchronise automatiquement les enseignants
                </Typography>

                <FormControlLabel
                  control={<Switch checked={forceUpdate} onChange={(e) => setForceUpdate(e.target.checked)} color="warning" sx={{ mt: 1 }} />}
                  label="Forcer la mise à jour"
                />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: 0.5 }}>
                  Régénère même si l'emploi existe déjà
                </Typography>

                <FormControlLabel
                  control={<Switch checked={generateForAll} onChange={(e) => setGenerateForAll(e.target.checked)} color="info" sx={{ mt: 1 }} />}
                  label="Générer TOUTES les classes"
                />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: 0.5 }}>
                  Génère les emplois pour toutes les classes
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', height: '100%' }}>
                <Typography variant="h6" gutterBottom color="#1565c0">
                  ⚡ Synchronisation Automatique
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Sync fontSize="small" color="info" />
                    <Typography variant="body2" fontWeight="500">
                      Création automatique des emplois enseignants
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Person fontSize="small" color="secondary" />
                    <Typography variant="body2" fontWeight="500">
                      Vérification de la disponibilité
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Warning fontSize="small" color="warning" />
                    <Typography variant="body2" fontWeight="500">
                      Prévention des surcharges
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle fontSize="small" color="success" />
                    <Typography variant="body2" fontWeight="500">
                      Mise à jour en temps réel
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box textAlign="center" mt={4}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading || generateLoading ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
              onClick={generateSchedule}
              disabled={(!selectedClass && !generateForAll) || loading || generateLoading}
              sx={{
                bgcolor: '#1976d2',
                px: 6,
                py: 1.5,
                fontSize: '1rem',
                borderRadius: 2,
                minWidth: 300,
                '&:hover': { bgcolor: '#1565c0' }
              }}
            >
              {generateLoading ? 'Génération globale...' : 
               loading ? 'Génération en cours...' : 
               generateForAll ? 'Générer tous les emplois' : 
               smartMode ? 'Générer avec synchronisation' : 'Générer cet emploi'}
            </Button>
          </Box>
        </Card>
      )}

      {/* Tab 2: Emplois des Classes */}
      {tabValue === 1 && (
        <Card sx={{ p: 4, boxShadow: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" sx={{ color: '#1976d2' }}>
              <School sx={{ mr: 1, verticalAlign: 'middle' }} />
              Emplois du Temps par Classe
            </Typography>
            <Box display="flex" gap={1}>
              <Button startIcon={<Refresh />} onClick={refreshAllData} variant="outlined">Actualiser</Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f7fa' }}>
                <TableRow>
                  <TableCell><strong>Classe</strong></TableCell>
                  <TableCell><strong>Étudiants</strong></TableCell>
                  <TableCell><strong>Matières</strong></TableCell>
                  <TableCell><strong>Créneaux</strong></TableCell>
                  <TableCell><strong>Enseignants</strong></TableCell>
                  <TableCell><strong>Dernière mise à jour</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map(schedule => (
                  <TableRow key={schedule.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <School color="primary" />
                        <Typography fontWeight="bold">{schedule.class_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={`${schedule.class_info?.student_count || 0} étudiants`} color="primary" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${schedule.time_slots?.reduce((acc, slot) => {
                        const subjects = new Set(acc);
                        subjects.add(slot.subject_name);
                        return [...subjects];
                      }, []).length || 0} matières`} variant="outlined" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${schedule.time_slots?.length || 0} créneaux`} color={schedule.time_slots?.length >= 20 ? "success" : "warning"} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${schedule.teachers?.length || 0} enseignants`} color="secondary" size="small" />
                    </TableCell>
                    <TableCell>
                      {new Date(schedule.updated_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      {schedule.time_slots?.length >= 20 ? <Chip label="Complet" color="success" size="small" /> :
                       schedule.time_slots?.length > 0 ? <Chip label="Partiel" color="warning" size="small" /> :
                       <Chip label="Vide" color="error" size="small" />}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Voir détails">
                          <IconButton size="small" onClick={() => viewScheduleDetails(schedule.id)} color="primary"><Visibility /></IconButton>
                        </Tooltip>
                        <Tooltip title="Exporter">
                          <IconButton size="small" onClick={() => exportSchedule(schedule)} color="secondary"><Download /></IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {schedules.length === 0 && (
            <Alert severity="info" sx={{ mt: 3 }}>Aucun emploi du temps généré. Utilisez l'onglet "Génération" pour commencer.</Alert>
          )}
        </Card>
      )}

      {/* Tab 3: Emplois des Enseignants */}
      {tabValue === 2 && (
        <Card sx={{ p: 4, boxShadow: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" sx={{ color: '#9c27b0' }}>
              <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
              Emplois des Enseignants
            </Typography>
            <Button startIcon={<Refresh />} onClick={refreshAllData} variant="outlined">Actualiser</Button>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f7fa' }}>
                <TableRow>
                  <TableCell><strong>Enseignant</strong></TableCell>
                  <TableCell><strong>Spécialité</strong></TableCell>
                  <TableCell><strong>Heures / Semaine</strong></TableCell>
                  <TableCell><strong>Classes</strong></TableCell>
                  <TableCell><strong>Créneaux</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teacherScheduleDetails.map((schedule) => {
                  const teacherHours = calculateTeacherHours(schedule);
                  const isFull = schedule.is_full || teacherHours >= schedule.max_hours;
                  const classesCount = schedule.time_slots ? 
                    new Set(schedule.time_slots.map(slot => slot.class_name)).size : 0;
                  
                  return (
                    <TableRow key={schedule.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Person color="secondary" />
                          <div>
                            <Typography fontWeight="bold">{schedule.teacher_name}</Typography>
                            <Typography variant="body2" color="textSecondary">{schedule.teacher_email}</Typography>
                          </div>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={schedule.teacher_specialty || 'Non spécifié'} size="small" color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography fontWeight="medium">{teacherHours}h / {schedule.max_hours}h</Typography>
                          <LinearProgress variant="determinate" value={(teacherHours / schedule.max_hours) * 100} sx={{ width: '100px', height: 8, borderRadius: 4, mt: 0.5 }} color={isFull ? "error" : "primary"} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${classesCount} classes`} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={`${schedule.time_slots?.length || 0} créneaux`} color={schedule.time_slots?.length > 15 ? "warning" : "info"} size="small" />
                      </TableCell>
                      <TableCell>
                        {isFull ? <Chip label="Complet" color="error" size="small" /> :
                         teacherHours > schedule.max_hours * 0.8 ? <Chip label="Presque complet" color="warning" size="small" /> :
                         <Chip label="Disponible" color="success" size="small" />}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Voir emploi">
                            <IconButton size="small" onClick={() => viewTeacherScheduleDetails(schedule.id)} color="primary"><Visibility /></IconButton>
                          </Tooltip>
                          <Tooltip title="Exporter">
                            <IconButton size="small" onClick={() => exportTeacherSchedule(schedule)} color="secondary"><Download /></IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {teacherScheduleDetails.length === 0 && (
            <Alert severity="info" sx={{ mt: 3 }}>Aucun emploi d'enseignant disponible. Générez d'abord des emplois de classe.</Alert>
          )}
        </Card>
      )}

      {/* Dialog pour voir les détails d'une classe - DESIGN AMÉLIORÉ */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight="600">
              Emploi du temps - {selectedSchedule?.class_name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSchedule && (
            <>
              {/* Statistiques */}
              <Box display="flex" gap={2} mb={4} flexWrap="wrap">
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Total créneaux</Typography>
                  <Typography variant="h4" color="#1976d2">{selectedSchedule.time_slots?.length || 0}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Matières</Typography>
                  <Typography variant="h4" color="#2e7d32">{[...new Set(selectedSchedule.time_slots?.map(s => s.subject_name))].length}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Enseignants</Typography>
                  <Typography variant="h4" color="#9c27b0">{[...new Set(selectedSchedule.time_slots?.map(s => s.teacher_name))].length}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Heures totales</Typography>
                  <Typography variant="h4" color="#ed6c02">{calculateTeacherHours(selectedSchedule)}h</Typography>
                </Paper>
              </Box>

              {/* Emploi du temps organisé par jour */}
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 3 }}>
                📅 Organisation par jour
              </Typography>
              
              {(() => {
                const slotsByDay = organizeSlotsByDay(selectedSchedule.time_slots);
                const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
                
                return (
                  <Box>
                    {days.map(day => (
                      <DayScheduleCard
                        key={day}
                        day={day}
                        slots={slotsByDay[day]}
                        color={getDayColor(day)}
                      />
                    ))}
                  </Box>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setViewDialogOpen(false)}>Fermer</Button>
          <Button variant="contained" onClick={() => selectedSchedule && exportSchedule(selectedSchedule)} startIcon={<Download />}>
            Exporter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour voir les détails d'un enseignant - DESIGN AMÉLIORÉ */}
      <Dialog open={teacherDialogOpen} onClose={() => setTeacherDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Person color="secondary" />
            <Typography variant="h6" fontWeight="600">
              Emploi du temps - {selectedTeacherSchedule?.teacher_name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTeacherSchedule && (
            <>
              {/* Statistiques enseignant */}
              <Box display="flex" gap={2} mb={4} flexWrap="wrap">
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Heures totales</Typography>
                  <Typography variant="h4" color="#1976d2">{calculateTeacherHours(selectedTeacherSchedule)}h</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Heures max</Typography>
                  <Typography variant="h4" color="#d32f2f">{selectedTeacherSchedule.max_hours}h</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Classes</Typography>
                  <Typography variant="h4" color="#2e7d32">{new Set(selectedTeacherSchedule.time_slots?.map(s => s.class_name)).size || 0}</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">Créneaux</Typography>
                  <Typography variant="h4" color="#9c27b0">{selectedTeacherSchedule.time_slots?.length || 0}</Typography>
                </Paper>
              </Box>

              {/* Barre de progression */}
              <Box sx={{ mb: 4 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle2">Charge de travail</Typography>
                  <Typography variant="subtitle2" fontWeight="600">
                    {calculateTeacherHours(selectedTeacherSchedule)}h / {selectedTeacherSchedule.max_hours}h
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(calculateTeacherHours(selectedTeacherSchedule) / selectedTeacherSchedule.max_hours) * 100} 
                  sx={{ height: 10, borderRadius: 5 }} 
                  color={calculateTeacherHours(selectedTeacherSchedule) >= selectedTeacherSchedule.max_hours ? "error" : "primary"} 
                />
              </Box>

              {/* Emploi du temps organisé par jour */}
              <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0', mb: 3 }}>
                📅 Programme hebdomadaire
              </Typography>
              
              {(() => {
                const slotsByDay = organizeSlotsByDay(selectedTeacherSchedule.time_slots);
                const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
                
                return (
                  <Box>
                    {days.map(day => (
                      <TeacherDaySchedule
                        key={day}
                        day={day}
                        slots={slotsByDay[day]}
                        color={getDayColor(day)}
                      />
                    ))}
                    
                    {selectedTeacherSchedule.time_slots?.length === 0 && (
                      <Alert severity="info" sx={{ mt: 3 }}>
                        Cet enseignant n'a pas encore de cours programmé.
                      </Alert>
                    )}
                  </Box>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setTeacherDialogOpen(false)}>Fermer</Button>
          <Button variant="contained" onClick={() => selectedTeacherSchedule && exportTeacherSchedule(selectedTeacherSchedule)} startIcon={<Download />}>
            Exporter
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}