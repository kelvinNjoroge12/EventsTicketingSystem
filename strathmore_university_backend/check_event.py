from apps.events.models import Event
try:
    e = Event.objects.get(slug='the-annual-strathmore-alumni-connect-a0f42160')
    print(f'Tickets: {list(e.ticket_types.values_list("name", flat=True))}')
    print(f'Speakers: {list(e.speakers.values_list("name", flat=True))}')
    print(f'Sponsors: {list(e.event_sponsors.values_list("name", flat=True))}')
except Exception as err:
    print(f'Error: {err}')
