from apps.servicios.serializers import JardinSerializer
from apps.servicios.models import Reserva, FormaTerreno
r = Reserva.objects.first()
f = FormaTerreno.objects.first()
data = {'reserva': r.id_reserva, 'descripcion': 'Test con zonas', 'zonas': [{'nombre':'Cantero', 'ancho': 2.5, 'largo': 3.0, 'forma': f.id_forma if f else None}]}
s = JardinSerializer(data=data)
print('is_valid:', s.is_valid(), 'errors:', s.errors)
if s.is_valid():
    j = s.save()
    print('Created Jardin', j.id_jardin, 'zones:', j.zonas.count())
else:
    print('Validation failed')
