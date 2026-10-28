"""Dados fictícios de desenvolvimento.

cd back && .ven/bin/python -m scripts.seed
cd back && .ven/bin/python -m scripts.seed --reset  # só remove o seed
Rodar novamente reaplica perfis/respostas/senha das contas fictícias; mantém swipes feitos no app.
"""
import argparse
import asyncio
from datetime import date, datetime, timezone
from html import escape
from pathlib import Path

from app.core.config import settings
from app.core.database import client, get_db, init_indexes
from app.core.security import hash_password
from app.core.terms import TERMS_VERSION
from app.schemas.profile import ProfileData
from app.schemas.question import QuestionCreate

SEED = "missao-demo-v1"
PASSWORD = "Teste@123"
UPLOAD_DIR = Path(settings.upload_dir)
FILE_PREFIX = "seed-missao-v1-"

# A escala usa igualdade de alternativa e pesos, como o algoritmo atual (não distância ordinal).
SCALE = ["Concordo totalmente", "Concordo parcialmente", "Discordo parcialmente", "Discordo totalmente"]
QUESTIONS = [
    ("Economia", 5, "O governo deve reduzir impostos, mesmo que isso limite a expansão de serviços públicos."),
    ("Economia", 4, "Pessoas com renda mais alta devem pagar uma proporção maior de impostos."),
    ("Economia", 4, "A legislação trabalhista deve permitir mais negociação direta entre empregados e empregadores."),
    ("Papel do Estado", 5, "Empresas estatais de setores estratégicos devem permanecer sob controle público."),
    ("Papel do Estado", 4, "Programas de transferência de renda devem ser ampliados para reduzir a pobreza."),
    ("Papel do Estado", 4, "Parcerias com empresas privadas devem ser ampliadas na prestação de serviços públicos."),
    ("Segurança pública", 5, "Aumentar penas de crimes violentos deve ser uma prioridade da política de segurança."),
    ("Segurança pública", 4, "O acesso civil a armas de fogo deve ter regras mais restritivas."),
    ("Segurança pública", 4, "O sistema prisional deve destinar mais recursos à reinserção social de pessoas condenadas."),
    ("Educação", 5, "O poder público deve priorizar o investimento na rede pública de ensino."),
    ("Educação", 4, "Famílias devem poder escolher ensino domiciliar com supervisão e avaliação do poder público."),
    ("Educação", 3, "A educação básica deve incluir debates sobre cidadania e diferentes correntes políticas."),
    ("Costumes e direitos", 5, "Casais do mesmo sexo devem ter os mesmos direitos civis que casais de sexos diferentes."),
    ("Costumes e direitos", 4, "Convicções religiosas devem orientar a formulação de políticas públicas."),
    ("Costumes e direitos", 5, "A legislação sobre interrupção voluntária da gravidez deve permitir mais situações do que permite hoje."),
    ("Liberdade de expressão", 5, "Opiniões políticas ofensivas devem ser permitidas quando não envolvem ameaça ou incitação à violência."),
    ("Liberdade de expressão", 4, "Plataformas digitais devem responder legalmente quando deixam de cumprir ordens judiciais de remoção de conteúdo."),
    ("Liberdade de expressão", 3, "O governo deve financiar veículos públicos de comunicação com autonomia editorial."),
    ("Corrupção e instituições", 5, "Órgãos de investigação devem ter autonomia em relação ao governo para apurar corrupção."),
    ("Corrupção e instituições", 5, "O combate à corrupção deve respeitar as garantias de defesa, mesmo quando isso torna os processos mais lentos."),
    ("Corrupção e instituições", 4, "Regras de transparência sobre gastos públicos devem alcançar também partidos e campanhas eleitorais."),
    ("Participação política", 4, "Plebiscitos e referendos devem ser usados com mais frequência em decisões nacionais."),
    ("Participação política", 3, "O voto deve ser facultativo para todas as pessoas adultas."),
    ("Participação política", 3, "Participar de ações e debates do movimento Missão deve fazer parte da minha rotina."),
]

# nome, username, idade, gênero, interesse, cidade, estado, profissão, bio
PEOPLE = [
    ("Ana Souza", "ana.souza.demo", 24, "female", "both", "São Paulo", "SP", "Designer", "Café, livros e projetos que aproximam a comunidade."),
    ("Bruno Lima", "bruno.lima.demo", 28, "male", "both", "Campinas", "SP", "Professor", "Gosto de trilhas e de aprender ouvindo outras pessoas."),
    ("Camila Oliveira", "camila.oliveira.demo", 31, "female", "men", "Belo Horizonte", "MG", "Engenheira", "Cozinho no fim de semana e adoro cinema brasileiro."),
    ("Diego Santos", "diego.santos.demo", 35, "male", "women", "Recife", "PE", "Enfermeiro", "Praia cedo, música à noite e conversa sem pressa."),
    ("Elisa Costa", "elisa.costa.demo", 22, "female", "women", "Curitiba", "PR", "Estudante", "Entre um museu e uma pedalada, escolho os dois."),
    ("Felipe Rocha", "felipe.rocha.demo", 26, "male", "men", "Salvador", "BA", "Cozinheiro", "Receber amigos e testar receitas é meu programa favorito."),
    ("Gabriela Alves", "gabriela.alves.demo", 29, "female", "both", "Fortaleza", "CE", "Bibliotecária", "Clube do livro, caminhadas e voluntariado no bairro."),
    ("Henrique Martins", "henrique.martins.demo", 33, "male", "both", "Porto Alegre", "RS", "Arquiteto", "Curioso por cidades, fotografia e boas histórias."),
    ("Isabela Ribeiro", "isabela.ribeiro.demo", 18, "female", "men", "Goiânia", "GO", "Estudante", "Começando a faculdade e explorando música e cidadania."),
    ("João Pereira", "joao.pereira.demo", 41, "male", "women", "Brasília", "DF", "Analista", "Gosto de planejar viagens e conversar sobre o futuro."),
    ("Karina Melo", "karina.melo.demo", 37, "female", "women", "Manaus", "AM", "Bióloga", "Natureza, comida caseira e projetos de sustentabilidade."),
    ("Lucas Ferreira", "lucas.ferreira.demo", 23, "male", "men", "Natal", "RN", "Desenvolvedor", "Jogos de tabuleiro e ideias para melhorar a cidade."),
    ("Mariana Nunes", "mariana.nunes.demo", 45, "female", "both", "Florianópolis", "SC", "Empreendedora", "Adoro o mar, teatro e aprender coisas novas."),
    ("Nicolas Araújo", "nicolas.araujo.demo", 27, "male", "both", "Belém", "PA", "Jornalista", "Uma feira de rua e um bom debate fazem meu sábado."),
    ("Olívia Barros", "olivia.barros.demo", 30, "female", "men", "João Pessoa", "PB", "Fisioterapeuta", "Corrida leve, cinema e respeito às diferenças."),
    ("Pedro Carvalho", "pedro.carvalho.demo", 39, "male", "women", "Vitória", "ES", "Técnico", "Consertar coisas, cuidar de plantas e viajar de trem."),
    ("Rafaela Gomes", "rafaela.gomes.demo", 21, "female", "women", "Maceió", "AL", "Ilustradora", "Desenhos, música e passeios culturais sem roteiro."),
    ("Samuel Dias", "samuel.dias.demo", 34, "male", "men", "São Luís", "MA", "Contador", "Organização na semana, espontaneidade no fim de semana."),
    ("Tatiana Castro", "tatiana.castro.demo", 42, "female", "both", "Campo Grande", "MS", "Professora", "Livros, família e participação em iniciativas locais."),
    ("Vinícius Teixeira", "vinicius.teixeira.demo", 25, "male", "both", "Teresina", "PI", "Músico", "Violão, esporte e conversas que trazem novas perspectivas."),
]
ACCOUNTS = [
    ("Teste Principal", "teste.demo", 28, "male", "both", "São Paulo", "SP", "Conta de teste", "Perfil pronto para explorar e testar matches."),
    ("Teste Questionário", "questionario.demo", 26, "female", "both", "São Paulo", "SP", "Conta de teste", "Conta para testar o preenchimento do questionário."),
    ("Teste Match", "match.demo", 27, "female", "both", "São Paulo", "SP", "Conta de teste", "Café, cinema e boas conversas. Perfil pronto para testar muitos matches."),
]
RELATED_FIELDS = {
    "swipes": ("from_id", "to_id"),
    "blocks": ("blocker_id", "blocked_id"),
    "messages": ("sender_id", "recipient_id"),
    "reports": ("reporter_id", "reported_id"),
    "refresh_tokens": ("user_id",),
    "password_resets": ("user_id",),
    "password_reset_requests": ("user_id",),
}


def email_for(person):
    return person[1].removesuffix(".demo") + "@exemplo.test"


def avatar(person, index):
    name, username = person[:2]
    initials = "".join(word[0] for word in name.split()[:2])
    color = ["#234E52", "#553C9A", "#7B341E", "#1E429F", "#276749"][index % 5]
    filename = f"{FILE_PREFIX}{username}.svg"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="Avatar fictício de {escape(name, quote=True)}">'
        f'<rect width="600" height="800" fill="{color}"/>'
        '<g fill="white" text-anchor="middle" font-family="sans-serif">'
        f'<text x="300" y="380" font-size="120">{escape(initials)}</text>'
        f'<text x="300" y="490" font-size="28">{escape(name)}</text>'
        '<text x="300" y="550" font-size="22">PERFIL FICTÍCIO • TESTE</text></g></svg>',
        encoding="utf-8",
    )
    return f"/uploads/{filename}"


async def populate(db):
    people = PEOPLE + ACCOUNTS
    codes = [f"seed-missao-v1-q{i:02d}" for i in range(1, len(QUESTIONS) + 1)]
    # Não assumir propriedade de contas/perguntas existentes só pelo nome ou domínio.
    for person in people:
        existing = await db.users.find_one({"$or": [{"email": email_for(person)}, {"username": person[1]}]})
        if existing and (existing.get("seed") != SEED or existing.get("role") != "user" or existing["email"] != email_for(person) or existing["username"] != person[1]):
            raise ValueError("Colisão com conta existente; nenhum dado foi alterado.")
    if await db.questions.find_one({"code": {"$in": codes}, "seed": {"$ne": SEED}}):
        raise ValueError("Colisão com pergunta existente; nenhum dado foi alterado.")
    for code, (topic, weight, text) in zip(codes, QUESTIONS):
        question = QuestionCreate(topic=topic, weight=weight, text=text, options=[{"id": chr(65 + i), "text": value} for i, value in enumerate(SCALE)])
        await db.questions.update_one({"code": code}, {"$set": {**question.model_dump(by_alias=True), "seed": SEED}}, upsert=True)
    active = await db.questions.find({"active": True}).sort("_id", 1).to_list(None)
    now = datetime.now(timezone.utc)
    password_hash = hash_password(PASSWORD)
    users = []
    for index, person in enumerate(people):
        name, username, age, gender, interest, city, state, profession, bio = person
        today = date.today()
        birth_date = date(today.year - age, today.month, min(today.day, 28))
        profile = ProfileData(
            photos=[avatar(person, index)], birth_date=birth_date, gender=gender,
            interested_in=interest, description=f"[FICTÍCIO] {name}. {bio}",
            profession=profession, city=city, state=state, country="Brasil",
        ).model_dump(mode="json")
        answers = []
        for q_index, q in enumerate(active):
            # Faixas de afinidade e divergências determinísticas; a conta principal usa A.
            option = 0 if index == len(PEOPLE) or (q_index * 7 + index * 3) % 20 >= index else 1 + (index + q_index) % (len(q["options"]) - 1)
            option_id = "NONE" if index < len(PEOPLE) and (index + q_index) % 17 == 0 else q["options"][option]["id"]
            answers.append({"questionId": q["code"], "optionId": option_id})
        incomplete = person == ACCOUNTS[1]
        await db.users.update_one(
            {"email": email_for(person), "seed": SEED, "role": "user"},
            {"$set": {"username": username, "password_hash": password_hash, "profile": profile,
                      "profile_completed": True, "questionnaire_completed": not incomplete,
                      "answers": [] if incomplete else answers, "suspended": False,
                      # Aceite simulado, restrito às contas fictícias marcadas pelo seed.
                      "terms_accepted_at": now, "terms_version": TERMS_VERSION},
             "$setOnInsert": {"created_at": now}}, upsert=True,
        )
        users.append(await db.users.find_one({"email": email_for(person)}))
    # Todos os perfis fictícios elegíveis já curtiram todas as contas de demonstração.
    # Assim qualquer um deles pode disparar match após a curtida de volta.
    liked = 0
    for account in users[len(PEOPLE):]:
        interest = "men" if account["profile"]["gender"] == "male" else "women"
        for user in users[:len(PEOPLE)]:
            if user["profile"]["interested_in"] not in (interest, "both"):
                continue
            await db.swipes.update_one(
                {"from_id": user["_id"], "to_id": account["_id"]},
                {"$setOnInsert": {"action": "like", "created_at": now, "seed": SEED}}, upsert=True,
            )
            liked += 1
    # A conta principal também pode liderar o Discover da conta do questionário.
    await db.swipes.update_one(
        {"from_id": users[len(PEOPLE)]["_id"], "to_id": users[len(PEOPLE) + 1]["_id"]},
        {"$setOnInsert": {"action": "like", "created_at": now, "seed": SEED}}, upsert=True,
    )
    liked += 1
    # Deixa o match entre as duas contas prontas a uma curtida de distância.
    # A curtida enviada oculta teste.demo no Discover de match.demo, por design do app.
    await db.swipes.update_one(
        {"from_id": users[len(PEOPLE) + 2]["_id"], "to_id": users[len(PEOPLE)]["_id"]},
        {"$setOnInsert": {"action": "like", "created_at": now, "seed": SEED}}, upsert=True,
    )
    liked += 1
    print(f"Seed pronto: {len(QUESTIONS)} perguntas, {len(PEOPLE)} pessoas fictícias, {len(ACCOUNTS)} contas de teste, {liked} curtidas recebidas.")


async def reset(db):
    users = await db.users.find({"seed": SEED, "role": "user"}).to_list(None)
    ids = [u["_id"] for u in users]
    photos = {p for u in users for p in u.get("profile", {}).get("photos", [])}
    for collection, fields in RELATED_FIELDS.items():
        await db[collection].delete_many({"$or": [{field: {"$in": ids + [str(i) for i in ids]}} for field in fields]})
    await db.users.delete_many({"_id": {"$in": ids}, "seed": SEED, "role": "user"})
    questions = await db.questions.delete_many({"seed": SEED})
    for photo in photos:
        filename = photo.removeprefix("/uploads/")
        if filename.startswith(FILE_PREFIX) and Path(filename).name == filename and not await db.users.find_one({"profile.photos": photo}):
            (UPLOAD_DIR / filename).unlink(missing_ok=True)
    print(f"Seed removido: {len(ids)} contas e {questions.deleted_count} perguntas; admin e dados sem marca preservados.")


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="Remove somente este seed e suas interações; não recria os dados.")
    args = parser.parse_args()
    try:
        await init_indexes()
        if args.reset:
            await reset(get_db())
        else:
            await populate(get_db())
            print("Contas: teste@exemplo.test (pronta), questionario@exemplo.test (sem respostas), match@exemplo.test (pronta). Senha: Teste@123")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
