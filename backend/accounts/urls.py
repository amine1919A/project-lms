# backend/accounts/urls.py - MIS À JOUR
from django.urls import path
from .views import (
    RegisterView, ProfileView, ApproveUserView, AdminCreateView, 
    MyTokenObtainPairView, UserListView, PendingUserListView,
    TeacherListView, StudentListView, chat_contacts, get_users_by_role,
    get_current_user, change_password, check_username, user_stats
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Authentification
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Profil
    path("profile/", ProfileView.as_view(), name="profile"),
    path("profile/password/", change_password, name="change-password"),
    path("me/", get_current_user, name="current-user"),
    
    # Vérification
    path("check-username/", check_username, name="check-username"),
    
    # Gestion admin
    path("admin-create/", AdminCreateView.as_view(), name="admin-create"),
    path("approve/<int:pk>/", ApproveUserView.as_view(), name="approve-user"),
    
    # Listes
    path("users/", UserListView.as_view(), name="users-list"),
    path("pending/", PendingUserListView.as_view(), name="pending-users"),
    path("teachers/", TeacherListView.as_view(), name="teachers-list"),
    path("students/", StudentListView.as_view(), name="students-list"),
    path("chat/contacts/", chat_contacts, name="chat-contacts"),
    
    # API utilitaires
    path("users/filter/", get_users_by_role, name="users-by-role"),
    path("stats/", user_stats, name="user-stats"),
]