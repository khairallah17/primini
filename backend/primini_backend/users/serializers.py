from dj_rest_auth.serializers import UserDetailsSerializer, LoginSerializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .models import User, PasswordResetOTP


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users with basic info and product count."""
    products_count = serializers.SerializerMethodField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()
    last_login = serializers.DateTimeField(read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'is_active', 'date_joined', 'last_login', 'products_count'
        )
        read_only_fields = ('id', 'date_joined', 'last_login', 'products_count')
    
    def get_products_count(self, obj):
        """Get the count of products created by this user."""
        return obj.created_products.count()


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for user details with product history."""
    products_count = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()
    last_login = serializers.DateTimeField(read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'products_count', 'products'
        )
        read_only_fields = ('id', 'date_joined', 'last_login', 'products_count', 'products', 'is_staff', 'is_superuser')
    
    def get_products_count(self, obj):
        """Get the count of products created by this user."""
        return obj.created_products.count()
    
    def get_products(self, obj):
        """Get the list of products created by this user."""
        from primini_backend.products.serializers import ProductListSerializer
        products = obj.created_products.all().order_by('-created_at')[:50]  # Limit to 50 most recent
        return ProductListSerializer(products, many=True).data


class UserSerializer(UserDetailsSerializer):
    role = serializers.CharField(read_only=True)
    id = serializers.IntegerField(read_only=True, source='pk')
    username = serializers.CharField(read_only=True, allow_blank=True, allow_null=True, required=False)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active')
        read_only_fields = ('id', 'email', 'role', 'username', 'is_active')
    
    def to_representation(self, instance):
        """Ensure all required fields are included and superusers return role='admin'."""
        # Get base representation from parent
        representation = super().to_representation(instance)
        
        # Ensure id is present (convert from pk if needed)
        if 'id' not in representation:
            representation['id'] = instance.pk
        if 'pk' in representation:
            # Keep id, remove pk to avoid duplication
            if 'id' not in representation:
                representation['id'] = representation['pk']
            del representation['pk']
        
        # Ensure username is included (can be None)
        if 'username' not in representation:
            representation['username'] = getattr(instance, 'username', None)
        
        # Ensure role is included
        if 'role' not in representation:
            representation['role'] = getattr(instance, 'role', 'visitor')
        
        # If user is a superuser, always return role='admin'
        if instance.is_superuser:
            representation['role'] = 'admin'
        
        # Ensure all required fields are present
        required_fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if field not in representation:
                if field == 'id':
                    representation['id'] = instance.pk
                elif field == 'username':
                    representation['username'] = getattr(instance, 'username', None)
                elif field == 'role':
                    representation['role'] = 'admin' if instance.is_superuser else getattr(instance, 'role', 'visitor')
                else:
                    representation[field] = getattr(instance, field, '')
        
        return representation


class CustomLoginSerializer(LoginSerializer):
    """Custom login serializer that provides better error messages for inactive accounts."""
    
    def validate(self, attrs):
        username = attrs.get('username') or attrs.get('email')
        password = attrs.get('password')
        
        if username and password:
            # Try to get the user first to check if account exists and is active
            try:
                user = User.objects.get(email=username)
                if not user.is_active:
                    raise serializers.ValidationError(
                        'Votre compte n\'est pas encore activé. Un administrateur vous contactera dès que votre compte sera approuvé.'
                    )
            except User.DoesNotExist:
                pass  # Let authenticate handle invalid credentials
            
            # Authenticate the user
            user = authenticate(request=self.context.get('request'), username=username, password=password)
            
            if not user:
                raise serializers.ValidationError('Identifiants incorrects.')
            
            if not user.is_active:
                raise serializers.ValidationError(
                    'Votre compte n\'est pas encore activé. Un administrateur vous contactera dès que votre compte sera approuvé.'
                )
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Les identifiants sont requis.')


class RegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password1', 'password2',
            'first_name', 'last_name', 'enterprise_name', 'address', 'phone_number', 'role'
        )

    def validate_username(self, value):
        if value and User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ce nom d\'utilisateur est déjà utilisé.')
        return value

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas.'})
        
        # Determine role based on provided fields or explicit role parameter
        role = attrs.get('role')
        if not role:
            # If enterprise fields are provided, it's a client registration
            if attrs.get('enterprise_name') or attrs.get('address') or attrs.get('phone_number'):
                role = 'client'
            else:
                role = 'user'
        
        # Validate role
        valid_roles = ['client', 'user']
        if role not in valid_roles:
            raise serializers.ValidationError({'role': f'Le rôle doit être l\'un des suivants: {", ".join(valid_roles)}'})
        
        attrs['role'] = role
        return attrs

    def create(self, validated_data):
        role = validated_data.pop('role', 'user')
        
        # Create user with specified role
        # Clients are inactive by default, users are active
        is_active = role == 'user'
        
        user = User.objects.create_user(
            username=validated_data.get('username'),
            email=validated_data['email'],
            password=validated_data['password1'],
            role=role,
            is_active=is_active,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            enterprise_name=validated_data.get('enterprise_name', ''),
            address=validated_data.get('address', ''),
            phone_number=validated_data.get('phone_number', ''),
        )
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset OTP."""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Check if user exists."""
        try:
            user = User.objects.get(email=value)
            if not user.is_active:
                raise serializers.ValidationError('Ce compte n\'est pas actif.')
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            pass
        return value
    
    def save(self):
        """Generate and send OTP."""
        email = self.validated_data['email']
        try:
            user = User.objects.get(email=email)
            
            # Check if user can request a new OTP (1 minute cooldown)
            one_minute_ago = timezone.now() - timedelta(minutes=1)
            recent_otp = PasswordResetOTP.objects.filter(
                user=user,
                created_at__gte=one_minute_ago,
                is_used=False
            ).first()
            
            if recent_otp:
                raise serializers.ValidationError(
                    'Veuillez attendre 1 minute avant de demander un nouveau code.'
                )
            
            # Generate OTP
            otp = PasswordResetOTP.generate_otp(user)
            
            # Send email with OTP
            send_mail(
                subject='Réinitialisation de votre mot de passe - Avita',
                message=f'''
Bonjour,

Vous avez demandé à réinitialiser votre mot de passe sur Avita.

Votre code de vérification est : {otp.otp_code}

Ce code est valide pendant 10 minutes.

Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.

Cordialement,
L'équipe Avita
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@avita.ma',
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            return {'message': 'Un code de vérification a été envoyé à votre adresse email.'}
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            return {'message': 'Si cette adresse email existe, un code de vérification a été envoyé.'}


class PasswordResetVerifyOTPSerializer(serializers.Serializer):
    """Serializer for verifying OTP and generating reset token."""
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, min_length=6, required=True)
    
    def validate(self, attrs):
        """Verify OTP code."""
        email = attrs['email']
        otp_code = attrs['otp_code']
        
        try:
            user = User.objects.get(email=email)
            otp = PasswordResetOTP.objects.filter(
                user=user,
                otp_code=otp_code,
                is_used=False
            ).order_by('-created_at').first()
            
            if not otp:
                raise serializers.ValidationError('Code de vérification invalide.')
            
            if not otp.is_valid():
                raise serializers.ValidationError('Code de vérification expiré. Veuillez en demander un nouveau.')
            
            # Mark OTP as verified
            otp.verify()
            
            # Generate JWT-like token using Django's signing
            from django.core.signing import Signer
            signer = Signer()
            reset_token = signer.sign(f'password_reset:{user.id}:{otp.id}')
            
            attrs['user'] = user
            attrs['reset_token'] = reset_token
            return attrs
        except User.DoesNotExist:
            raise serializers.ValidationError('Code de vérification invalide.')


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for resetting password with JWT token."""
    reset_token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True
    )
    confirm_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True
    )
    
    def validate(self, attrs):
        """Validate passwords match and token is valid."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Les mots de passe ne correspondent pas.'})
        
        # Verify token
        from django.core.signing import Signer, BadSignature
        signer = Signer()
        
        try:
            signed_value = signer.unsign(attrs['reset_token'], max_age=timedelta(hours=1))
            # Token format: password_reset:user_id:otp_id
            parts = signed_value.split(':')
            if len(parts) != 3 or parts[0] != 'password_reset':
                raise serializers.ValidationError({'reset_token': 'Token invalide.'})
            
            user_id = int(parts[1])
            otp_id = int(parts[2])
            
            try:
                user = User.objects.get(id=user_id)
                otp = PasswordResetOTP.objects.get(id=otp_id, user=user, is_used=True)
                
                # Check if OTP was verified recently (within 1 hour)
                if not otp.verified_at or (timezone.now() - otp.verified_at) > timedelta(hours=1):
                    raise serializers.ValidationError({'reset_token': 'Token expiré. Veuillez recommencer le processus.'})
                
                attrs['user'] = user
                return attrs
            except (User.DoesNotExist, PasswordResetOTP.DoesNotExist):
                raise serializers.ValidationError({'reset_token': 'Token invalide.'})
        except BadSignature:
            raise serializers.ValidationError({'reset_token': 'Token invalide ou expiré.'})
    
    def save(self):
        """Reset user password."""
        user = self.validated_data['user']
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
        user.save()
        
        # Invalidate all OTPs for this user
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        
        return {'message': 'Votre mot de passe a été réinitialisé avec succès.'}
