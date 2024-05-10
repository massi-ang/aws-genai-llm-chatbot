from openinference.instrumentation.langchain import (
    LangChainInstrumentor as Instrumentor,
)
from openinference.semconv.resource import ResourceAttributes
from opentelemetry.sdk import trace as trace_sdk
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from urllib.parse import urljoin
import logging
from importlib.metadata import PackageNotFoundError
from importlib.util import find_spec
from typing import Any


class OpenInferenceExporter(OTLPSpanExporter):
    def __init__(self) -> None:
        host = "127.0.0.1"
        port = 4318
        endpoint = urljoin(
            f"http://{host}:{port}",
            "/v1/traces",
        )
        super().__init__(endpoint)


class LangChainInstrumentor(Instrumentor):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        if find_spec("langchain_core") is None:
            raise PackageNotFoundError(
                "Missing `langchain-core`. Install with `pip install langchain-core`."
            )
        super().__init__()

    def instrument(self) -> None:
        tracer_provider = trace_sdk.TracerProvider(
            resource=Resource(
                {ResourceAttributes.PROJECT_NAME: "PROJ", "ApplicationId": "langchain"}
            ),
            span_limits=trace_sdk.SpanLimits(max_attributes=10_000),
        )
        tracer_provider.add_span_processor(SimpleSpanProcessor(OpenInferenceExporter()))
        super().instrument(skip_dep_check=True, tracer_provider=tracer_provider)
