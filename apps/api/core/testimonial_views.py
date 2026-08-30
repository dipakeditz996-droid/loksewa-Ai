from rest_framework import viewsets, filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from administration.permissions import IsAdminUser
from .models import Testimonial
from .testimonial_serializers import AdminTestimonialSerializer, StudentTestimonialSerializer


class AdminTestimonialViewSet(viewsets.ModelViewSet):
    """CRUD for admins to author the testimonials shown on the public homepage."""
    queryset = Testimonial.objects.select_related('created_by').all()
    serializer_class = AdminTestimonialSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'role_title', 'quote']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MyTestimonialView(APIView):
    """Lets an already-authenticated student write (or edit) their own
    homepage testimonial, without ever touching a login screen again - this
    view is reached the same way every other authenticated student endpoint
    is, through the same stored access token apiClient already attaches.

    One row per account: writing again edits the same Testimonial rather than
    creating a second one. Every student-authored write resets is_published
    to False - a student can see whether their review is live, but can never
    publish it themselves, and editing a live review takes it back out of
    public view until an admin re-approves the new wording.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Wrapped in {"testimonial": ...} rather than returning the bare
        # object or None directly: DRF's JSONRenderer serializes a top-level
        # None response body to zero bytes, not the string "null", which a
        # generic fetch client reads as an empty response and normalizes to
        # {} - indistinguishable from "found a blank testimonial". Wrapping
        # it keeps "no review yet" unambiguous on the wire.
        testimonial = Testimonial.objects.filter(created_by=request.user).first()
        if not testimonial:
            return Response({'testimonial': None})
        return Response({'testimonial': StudentTestimonialSerializer(testimonial).data})

    def post(self, request):
        quote = (request.data.get('quote') or '').strip()
        if not quote:
            return Response({'quote': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        name = (request.data.get('name') or '').strip() or request.user.get_full_name() or request.user.username
        role_title = (request.data.get('role_title') or '').strip()
        avatar_url = (request.data.get('avatar_url') or '').strip() or (request.user.avatar or '')
        rating = request.data.get('rating', 5)
        try:
            rating = max(1, min(5, int(rating)))
        except (TypeError, ValueError):
            rating = 5

        testimonial, _created = Testimonial.objects.update_or_create(
            created_by=request.user,
            defaults={
                'name': name,
                'role_title': role_title,
                'quote': quote,
                'avatar_url': avatar_url,
                'rating': rating,
                'is_published': False,
            },
        )
        return Response(StudentTestimonialSerializer(testimonial).data, status=status.HTTP_200_OK)

    def delete(self, request):
        Testimonial.objects.filter(created_by=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
