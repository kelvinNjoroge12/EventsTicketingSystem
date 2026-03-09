from rest_framework import serializers
from .models import Expense, Revenue

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'event', 'description', 'amount', 'category', 'date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RevenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revenue
        fields = ["id", "event", "description", "amount", "source", "date", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
