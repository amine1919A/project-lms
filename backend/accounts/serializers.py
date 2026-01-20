# backend/accounts/serializers.py → VERSION FINALE CORRIGÉE À 1000%
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from classes.models import Specialty  # ON UTILISE CELUI DE CLASSES

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    specialty = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name",
            "role", "approved", "specialty", "is_staff", "is_superuser"
        )
        read_only_fields = ("id", "approved", "is_staff", "is_superuser")


# accounts/serializers.py → REMPLACE LE CHAMP specialty DANS RegisterSerializer PAR ÇA :

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    # Spécialité peut être soit un ID soit un nom
    specialty = serializers.CharField(
        required=False, 
        allow_blank=True, 
        allow_null=True,
        help_text="Pour les enseignants: ID ou nom de la spécialité"
    )

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name", "role", "specialty")
        extra_kwargs = {
            'specialty': {'required': False}
        }

    def validate(self, attrs):
        role = attrs.get("role")
        specialty_input = attrs.get("specialty")

        # Validation pour les enseignants
        if role == "teacher":
            if not specialty_input:
                raise serializers.ValidationError({
                    "specialty": "La spécialité est obligatoire pour les enseignants."
                })
            
            try:
                # Essayer de trouver par ID
                if isinstance(specialty_input, int) or (isinstance(specialty_input, str) and specialty_input.isdigit()):
                    specialty_obj = Specialty.objects.get(id=int(specialty_input))
                else:
                    # Essayer de trouver par nom
                    specialty_obj = Specialty.objects.get(name__iexact=specialty_input.strip())
                
                attrs["specialty"] = specialty_obj
                
            except Specialty.DoesNotExist:
                # Afficher les spécialités disponibles
                specialties = Specialty.objects.values('id', 'name')
                available = ", ".join([f"{s['id']}:{s['name']}" for s in specialties])
                raise serializers.ValidationError({
                    "specialty": f"Spécialité '{specialty_input}' introuvable. Disponibles: {available}"
                })
                
        elif role == "student":
            # Les étudiants n'ont pas besoin de spécialité
            attrs["specialty"] = None
            
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        specialty = validated_data.pop("specialty", None)

        user = User(**validated_data)
        user.set_password(password)
        
        # Les enseignants ne sont pas approuvés automatiquement
        user.approved = False
        
        user.save()

        if specialty:
            user.specialty = specialty
            user.save()

        return user


class AdminCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "role", "first_name", "last_name")

    def validate_role(self, value):
        if value != "admin":
            raise serializers.ValidationError("Ce endpoint ne crée que des comptes admin.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.role = "admin"
        user.approved = True
        user.is_staff = True
        user.is_superuser = False
        user.save()
        return user