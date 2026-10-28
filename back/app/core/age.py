from datetime import date

MIN_AGE = 18
MAX_AGE = 120


def age_on(birth_date: date, today: date | None = None) -> int:
    today = today or date.today()
    before_birthday = (today.month, today.day) < (birth_date.month, birth_date.day)
    return today.year - birth_date.year - before_birthday
