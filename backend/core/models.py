from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class User(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('concepteur', 'Concepteur'),
        ('technicien', 'Technicien'),
    ]
    
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=50, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='concepteur')
    password = models.CharField(max_length=255)  # Store hashed password
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
    
    def __str__(self) -> str:
        return f"{self.name} ({self.email}) - {self.get_role_display()}"
    
    def set_password(self, raw_password):
        """Hash and set the password"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check if the provided password matches"""
        return check_password(raw_password, self.password)
    
    @property
    def is_authenticated(self):
        """
        Always return True for authenticated users.
        This is required for Django REST Framework's IsAuthenticated permission.
        """
        return True
    
    @property
    def is_anonymous(self):
        """Always return False since this is not an anonymous user"""
        return False
    
    def save(self, *args, **kwargs):
        # If password is being set and it's not already hashed, hash it
        if self.password and not self.password.startswith('pbkdf2_'):
            self.set_password(self.password)
        super().save(*args, **kwargs)


class Booking(models.Model):
    calendar_id = models.CharField(max_length=100)
    booking_date = models.DateField()
    booking_time = models.CharField(max_length=20, blank=True)
    client_name = models.CharField(max_length=255)
    client_phone = models.CharField(max_length=50)
    designer_name = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.booking_date} - {self.client_name} ({self.calendar_id})"


class ContactMessage(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.subject} - {self.email}"


class Holiday(models.Model):
    """Model to store invalid/holiday days per calendar"""
    calendar_id = models.CharField(max_length=100)
    holiday_date = models.DateField()
    description = models.CharField(max_length=255, blank=True, help_text="Optional description (e.g., 'Jour férié', 'Fermeture exceptionnelle')")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['holiday_date']
        unique_together = ['calendar_id', 'holiday_date']  # Prevent duplicate holidays for same calendar and date
    
    def __str__(self) -> str:
        return f"{self.calendar_id} - {self.holiday_date} ({self.description or 'Jour férié'})"