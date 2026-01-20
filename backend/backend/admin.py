from django.contrib import admin
from accounts.models import CustomUser
from classes.models import Class, Subject
from courses.models import Course, File
from lms_sessions.models import Session, Test, TestScore
from notifications.models import Notification, ChatMessage

admin.site.register(CustomUser)
admin.site.register(Class)
admin.site.register(Subject)
admin.site.register(Course)
admin.site.register(File)
admin.site.register(Session)
admin.site.register(Test)
admin.site.register(TestScore)
admin.site.register(Notification)
admin.site.register(ChatMessage)