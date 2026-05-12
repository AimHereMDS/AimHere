from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Round(Base):
    __tablename__ = "rounds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"), index=True)
    round_index: Mapped[int] = mapped_column(Integer)
    real_lat: Mapped[float] = mapped_column(Float)
    real_lng: Mapped[float] = mapped_column(Float)
    guess_lat: Mapped[float] = mapped_column(Float)
    guess_lng: Mapped[float] = mapped_column(Float)
    ai_guess_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_guess_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_km: Mapped[float] = mapped_column(Float)
    ai_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    score: Mapped[int] = mapped_column(Integer)
    ai_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hint_count: Mapped[int] = mapped_column(Integer, default=0)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    game = relationship("Game", back_populates="rounds")
