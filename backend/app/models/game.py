from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    mode: Mapped[str] = mapped_column(String(20), default="single")
    location_mode: Mapped[str] = mapped_column(String(20), default="default")
    filter_text: Mapped[str | None] = mapped_column(String(300), nullable=True)
    movement_mode: Mapped[str] = mapped_column(String(30), default="rotation")
    movement_limit: Mapped[int] = mapped_column(Integer, default=5)
    timer_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rounds_played: Mapped[int] = mapped_column(Integer, default=0)
    total_score: Mapped[int] = mapped_column(Integer, default=0)
    ai_total_score: Mapped[int] = mapped_column(Integer, default=0)
    rounds_won: Mapped[int] = mapped_column(Integer, default=0)
    ai_rounds_won: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user = relationship("UserProfile", back_populates="games")
    rounds = relationship("Round", back_populates="game", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="game")
