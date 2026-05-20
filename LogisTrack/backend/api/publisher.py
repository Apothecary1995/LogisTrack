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
        print(f"[RabbitMQ] Notification published: {message.get('event')}")

    except Exception as e:
        print(f"[RabbitMQ] Publish error: {e}")


def publish_export(message: dict):
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
            routing_key="export.request",
            body=json.dumps(message),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )

        connection.close()
        print(f"[RabbitMQ] Export published")

    except Exception as e:
        print(f"[RabbitMQ] Publish error: {e}")