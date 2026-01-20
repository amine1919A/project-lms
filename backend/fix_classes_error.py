# backend/check_and_fix_serializers.py
import os
import sys

def check_serializers():
    print("=== VÉRIFICATION ET CORRECTION DES SÉRIALISEURS ===")
    
    filepath = "classes/serializers.py"
    
    if not os.path.exists(filepath):
        print(f"❌ Fichier {filepath} non trouvé")
        return
    
    print(f"\n📖 Lecture de {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifier les sérialiseurs nécessaires
    required_serializers = [
        'SubjectSerializer',
        'ClassSerializer', 
        'SpecialtySerializer',
        'StudentInClassSerializer',
        'SubjectInClassSerializer'
    ]
    
    print("\n🔍 Vérification des sérialiseurs...")
    missing = []
    for serializer in required_serializers:
        if f'class {serializer}' not in content:
            missing.append(serializer)
            print(f"   ❌ Manquant: {serializer}")
        else:
            print(f"   ✅ Présent: {serializer}")
    
    if missing:
        print(f"\n⚠️  {len(missing)} sérialiseur(s) manquant(s): {', '.join(missing)}")
        
        if 'SubjectSerializer' in missing:
            print("\n📝 Ajout de SubjectSerializer manquant...")
            
            # Ajouter SubjectSerializer à la fin du fichier
            subject_serializer_code = """

# SERIALIZER POUR LES MATIÈRES
class SubjectSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_assigned.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True, allow_null=True)
    teacher_username = serializers.CharField(source='teacher.username', read_only=True, allow_null=True)
    specialty_name = serializers.CharField(source='specialty.name', read_only=True, allow_null=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'class_assigned', 'class_name',
            'teacher', 'teacher_name', 'teacher_username',
            'specialty', 'specialty_name'
        ]
"""
            
            with open(filepath, 'a', encoding='utf-8') as f:
                f.write(subject_serializer_code)
            
            print("✅ SubjectSerializer ajouté avec succès!")
    
    # Vérifier les imports
    print("\n🔍 Vérification des imports...")
    
    if 'from .models import Class, Subject, Specialty' not in content:
        print("❌ Import des modèles manquant ou incorrect")
        print("\n📝 Correction des imports...")
        
        lines = content.split('\n')
        new_lines = []
        
        for line in lines:
            if line.startswith('from .models import'):
                new_lines.append('from .models import Class, Subject, Specialty')
            elif line.startswith('from accounts.models import'):
                new_lines.append('from accounts.models import CustomUser')
            else:
                new_lines.append(line)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        
        print("✅ Imports corrigés")
    else:
        print("✅ Imports corrects")
    
    print("\n" + "="*60)
    print("✅ VÉRIFICATION TERMINÉE")
    print("\nProchaine étape: python manage.py makemigrations")

if __name__ == '__main__':
    check_serializers()