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


def publish_trip(trip_data: dict):
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
            routing_key="trip.created",
            body=json.dumps(trip_data),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )

        connection.close()
        print(f"[RabbitMQ] Trip published: {trip_data.get('trip_id')}")

    except Exception as e:
        print(f"[RabbitMQ] Publish error: {e}")


def publish_vehicle(vehicle_data: dict):
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
            routing_key="vehicle.created",
            body=json.dumps(vehicle_data),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )

        connection.close()
        print(f"[RabbitMQ] Vehicle published: {vehicle_data.get('vehicle_id')}")

    except Exception as e:
        print(f"[RabbitMQ] Publish error: {e}")


def publish_service(service_data: dict):
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
            routing_key=service_data.get("event", "service.created"),
            body=json.dumps(service_data),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )

        connection.close()
        print(f"[RabbitMQ] Service published: {service_data.get('event')} id={service_data.get('service_id')}")

    except Exception as e:
        print(f"[RabbitMQ] Publish error: {e}")


def publish_fuel(fuel_data: dict):
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
            routing_key=fuel_data.get("event", "fuel.created"),
            body=json.dumps(fuel_data),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )

        connection.close()
        print(f"[RabbitMQ] Fuel published: {fuel_data.get('event')} id={fuel_data.get('fuel_id')}")

    except Exception as e:
        print(f"[RabbitMQ] Publish error: {e}")