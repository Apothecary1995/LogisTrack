import json
import os
import pika

def publish_notification(message: dict):
    url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    
    try:
        params = pika.URLParameters(url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        
        channel.exchange_declare(
            exchange="logistrack.events",
            exchange_type="topic",
            durable=True
        )
        
        channel.basic_publish(
            exchange="logistrack.events",
            routing_key="notification.send",
            body=json.dumps(message),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )
        
        connection.close()
        
    except Exception as e:
        print(f"RabbitMQ publish error: {e}")