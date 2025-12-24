from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from .models import User


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that works with the custom User model (core.models.User)
    instead of Django's default User model.
    """
    
    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        Overrides the default implementation to use our custom User model.
        """
        try:
            user_id = validated_token.get('user_id')
        except (KeyError, AttributeError, TypeError):
            raise InvalidToken('Token contained no recognizable user identification')
        
        if not user_id:
            raise InvalidToken('Token contained no recognizable user identification')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise InvalidToken('User not found')
        except Exception as e:
            raise InvalidToken(f'Error retrieving user: {str(e)}')
        
        return user

