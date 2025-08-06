mongodump --uri="mongodb://localhost:27017/renta_autos" --out="C:\Backups\Full\%date%"
mongodump --uri="mongodb://localhost:27017/renta_autos" --query='{"updatedAt": {"$gte": ISODate("2025-08-05T00:00:00Z")}}' --out="C:\Backups\Diferencial\%date%"
