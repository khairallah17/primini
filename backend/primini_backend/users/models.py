from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import secrets


class UserManager(BaseUserManager):
    """Custom manager that authenticates users with their email address."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('L\'adresse e-mail doit être renseignée.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')  # Auto-set role to admin for superusers

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Les super utilisateurs doivent avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Les super utilisateurs doivent avoir is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = [
        ('visitor', 'Visiteur'),
        ('user', 'Utilisateur'),
        ('client', 'Client'),
        ('admin', 'Admin'),
    ]

    username = models.CharField('nom d\'utilisateur', max_length=150, unique=True, null=True, blank=True)
    email = models.EmailField('adresse e-mail', unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='visitor')
    enterprise_name = models.CharField('nom de l\'entreprise', max_length=200, blank=True, null=True)
    address = models.TextField('adresse', blank=True, null=True)
    phone_number = models.CharField('numéro de téléphone', max_length=20, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def is_admin(self):
        return self.role == 'admin' or self.is_superuser

    @property
    def is_client(self):
        return self.role == 'client'

    @property
    def is_user(self):
        return self.role == 'user'

    @property
    def is_visitor(self):
        return self.role == 'visitor'

    def __str__(self):
        return self.username or self.email


class PasswordResetOTP(models.Model):
    """Model to store OTP codes for password reset with expiration."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'otp_code']),
        ]
    
    def __str__(self):
        return f"OTP for {self.user.email} - {self.otp_code}"
    
    @classmethod
    def generate_otp(cls, user):
        """Generate a new 6-digit OTP for the user."""
        # Invalidate any existing unused OTPs for this user
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Generate 6-digit OTP
        otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        
        # Create OTP with 10 minutes expiration
        expires_at = timezone.now() + timedelta(minutes=10)
        
        return cls.objects.create(
            user=user,
            otp_code=otp_code,
            expires_at=expires_at
        )
    
    def is_valid(self):
        """Check if OTP is still valid (not used and not expired)."""
        return not self.is_used and timezone.now() < self.expires_at
    
    def verify(self):
        """Mark OTP as used and verified."""
        if self.is_valid():
            self.is_used = True
            self.verified_at = timezone.now()
            self.save()
            return True
        return False
    
    def can_retry(self):
        """Check if user can request a new OTP (1 minute cooldown)."""
        # Check if there's a recent OTP request (within last minute)
        one_minute_ago = timezone.now() - timedelta(minutes=1)
        recent_otp = PasswordResetOTP.objects.filter(
            user=self.user,
            created_at__gte=one_minute_ago
        ).exclude(id=self.id).first()
        
        return recent_otp is None
