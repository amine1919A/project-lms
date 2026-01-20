// src/pages/admin/AdminCourses.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api, { extractArray } from "../../services/api";

import {
  Container, Grid, Card, CardContent, CardHeader, Typography,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Chip, LinearProgress, Fab, Box, Avatar
} from '@mui/material';
import { Add, Delete, Edit, Download, School, UploadFile } from '@mui/icons-material';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', file: null });

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) loadSubjects(selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject) loadCourses();
  }, [selectedClass, selectedSubject]);

  const loadClasses = async () => {
    try {
      const res = await api.get('/classes/classes/');
      setClasses(res.data);
    } catch (err) {
      toast.error('Erreur chargement classes');
    }
  };

  const loadSubjects = async (classId) => {
    try {
      const res = await api.get('/classes/subjects/');
      const filtered = res.data.filter(s => s.class_assigned === parseInt(classId));
      setSubjects(filtered);
    } catch (err) {
      toast.error('Erreur matières');
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/courses/courses/');
      const filtered = res.data.filter(c => c.subject === parseInt(selectedSubject));
      setCourses(filtered);
    } catch (err) {
      toast.error('Erreur cours');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!form.title || !form.file) return toast.error("Titre et fichier requis");

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description || '');
    formData.append('subject', selectedSubject);
    formData.append('file', form.file);

    try {
      await api.post('/courses/files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Cours uploadé avec succès !');
      setForm({ title: '', description: '', file: null });
      setOpen(false);
      loadCourses();
    } catch (err) {  // CORRIGÉ ICI : (err) et pas (err=>
      console.error('Erreur upload:', err.response?.data || err);
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'upload du fichier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce cours ?")) return;
    try {
      await api.delete(`/courses/files/${id}/`);
      toast.success("Cours supprimé");
      loadCourses();
    } catch (err) {
      toast.error("Erreur suppression");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" color="#c62828">
            Gestion des Cours & Fichiers
          </Typography>
          <Typography color="textSecondary">
            Upload des PDF, devoirs, supports de cours
          </Typography>
        </div>
        <Fab color="primary" onClick={() => setOpen(true)}>
          <Add />
        </Fab>
      </Box>

      {/* Sélecteurs */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Classe</InputLabel>
              <Select value={selectedClass} onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject('');
              }}>
                <MenuItem value=""><em>Toutes les classes</em></MenuItem>
                {classes.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!selectedClass}>
              <InputLabel>Matière</InputLabel>
              <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <MenuItem value=""><em>Toutes les matières</em></MenuItem>
                {subjects.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.teacher_name || 'Non assigné'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Liste des cours */}
      {loading ? <LinearProgress /> : (
        <Grid container spacing={3}>
          {courses.map(course => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <Card sx={{ height: '100%', boxShadow: 3 }}>
                <CardHeader
                  avatar={<Avatar sx={{ bgcolor: '#c62828' }}><School /></Avatar>}
                  title={course.title}
                  subheader={course.subject_name}
                  action={
                    <IconButton onClick={() => handleDelete(course.id)}>
                      <Delete color="error" />
                    </IconButton>
                  }
                />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {course.description || 'Aucune description'}
                  </Typography>
                  <Chip label="PDF" size="small" color="primary" />
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Download />}
                    href={course.file}
                    target="_blank"
                    sx={{ bgcolor: '#c62828' }}
                  >
                    Télécharger
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog Upload */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload un nouveau cours</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Titre du cours"
            margin="normal"
            value={form.title}
            onChange={(e) => setForm({...form, title: e.target.value})}
          />
          <TextField
            fullWidth
            label="Description (optionnel)"
            multiline
            rows={3}
            margin="normal"
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFile />}
            fullWidth
            sx={{ mt: 2 }}
          >
            Choisir un fichier PDF
            <input
              type="file"
              hidden
              accept=".pdf"
              onChange={(e) => setForm({...form, file: e.target.files[0]})}
            />
          </Button>
          {form.file && <Typography sx={{ mt: 1, color: 'green' }}>{form.file.name}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!form.title || !form.file || !selectedSubject}
            sx={{ bgcolor: '#c62828' }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}