const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const DEPARTMENTS = [
  { code: "CSC",   name: "Computer Science",                  section: "Engineering" },
  { code: "EE",    name: "Electrical Engineering",            section: "Engineering" },
  { code: "ME",    name: "Mechanical Engineering",            section: "Engineering" },
  { code: "CE",    name: "Civil Engineering",                 section: "Engineering" },
  { code: "CHE",   name: "Chemical Engineering",              section: "Engineering" },
  { code: "BME",   name: "Biomedical Engineering",            section: "Engineering" },
  { code: "ENGR",  name: "General Engineering",               section: "Engineering" },
  { code: "MATH",  name: "Mathematics",                       section: "Sciences" },
  { code: "PHY",   name: "Physics",                           section: "Sciences" },
  { code: "CHEM",  name: "Chemistry & Biochemistry",          section: "Sciences" },
  { code: "BIO",   name: "Biology",                           section: "Sciences" },
  { code: "EAS",   name: "Earth & Atmospheric Sciences",      section: "Sciences" },
  { code: "ECO",   name: "Economics & Business",              section: "Social Sciences" },
  { code: "PSY",   name: "Psychology",                        section: "Social Sciences" },
  { code: "SOC",   name: "Sociology",                         section: "Social Sciences" },
  { code: "PSC",   name: "Political Science",                 section: "Social Sciences" },
  { code: "ANTH",  name: "Anthropology",                      section: "Social Sciences" },
  { code: "ENGL",  name: "English",                           section: "Humanities & Arts" },
  { code: "HIST",  name: "History",                           section: "Humanities & Arts" },
  { code: "PHIL",  name: "Philosophy",                        section: "Humanities & Arts" },
  { code: "ART",   name: "Art",                               section: "Humanities & Arts" },
  { code: "MUS",   name: "Music",                             section: "Humanities & Arts" },
  { code: "THSP",  name: "Theatre & Speech",                  section: "Humanities & Arts" },
  { code: "MCA",   name: "Media & Communication Arts",        section: "Media & Communications" },
  { code: "FILM",  name: "Film",                              section: "Media & Communications" },
  { code: "EDM",   name: "Electronic Design & Multimedia",    section: "Media & Communications" },
  { code: "LALS",  name: "Latin American & Latino Studies",   section: "Languages" },
  { code: "INTL",  name: "International & Global Studies",    section: "Languages" },
  { code: "WS",    name: "Women's & Gender Studies",          section: "Languages" },
  { code: "FREN",  name: "French",                            section: "Languages" },
  { code: "SPAN",  name: "Spanish",                           section: "Languages" },
  { code: "CHIN",  name: "Chinese",                           section: "Languages" },
  { code: "ARAB",  name: "Arabic",                            section: "Languages" },
  { code: "RUSS",  name: "Russian",                           section: "Languages" },
  { code: "EDUC",  name: "Teaching & Learning",               section: "Education" },
  { code: "LRLDC", name: "Learning, Leadership & Culture",    section: "Education" },
  { code: "ARCH",  name: "Architecture",                      section: "Architecture" },
  { code: "URBS",  name: "Urban Studies",                     section: "Architecture" },
  { code: "BLST",  name: "Black Studies",                     section: "Interdisciplinary" },
  { code: "IAS",   name: "Interdisciplinary Arts & Sciences", section: "Interdisciplinary" },
];

const BASE_URL = "https://ccny-undergraduate.catalog.cuny.edu";

async function scrapeDepartment(deptCode) {
  const url = `${BASE_URL}/departments/${deptCode}-CTY/courses`;
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const courses = [];

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 2) {
        const code = $(cells[0]).text().trim();
        const name = $(cells[1]).text().trim();
        if (code && name && /^[A-Z]+\s?\d{4,6}/.test(code)) {
          courses.push({ code, name });
        }
      }
    });

    if (courses.length === 0) {
      $("[class*='course'], [class*='Course']").each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/([A-Z]+\s?\d{4,6}[A-Z]?)\s+(.+)/);
        if (match) courses.push({ code: match[1].trim(), name: match[2].trim() });
      });
    }

    if (courses.length === 0) {
      $("h2, h3, h4, strong, b").each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/^([A-Z]+\s?\d{4,6}[A-Z]?)\s*[:\-–]?\s*(.+)/);
        if (match && match[2].length > 3) courses.push({ code: match[1].trim(), name: match[2].trim() });
      });
    }

    if (courses.length === 0) {
      $("p, li, div").each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/^([A-Z]+\s?\d{4,6}[A-Z]?)\s+([A-Z].{5,80}?)(?:\s+\d+\s*cr|\s*$)/m);
        if (match) {
          const code = match[1].trim();
          const name = match[2].trim();
          if (!courses.find((c) => c.code === code)) courses.push({ code, name });
        }
      });
    }

    const seen = new Set();
    return courses.filter((c) => {
      if (seen.has(c.code)) return false;
      seen.add(c.code);
      return true;
    });

  } catch (err) {
    console.warn(`  ⚠️  Failed: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log("🎓 CCNY Course Catalog Scraper\n");

  const sectionMap = {};
  for (const dept of DEPARTMENTS) {
    if (!sectionMap[dept.section]) sectionMap[dept.section] = [];
    sectionMap[dept.section].push(dept);
  }

  const result = [];

  for (const [sectionName, depts] of Object.entries(sectionMap)) {
    console.log(`\n📚 ${sectionName}`);
    const sectionDepts = [];

    for (const dept of depts) {
      process.stdout.write(`  → ${dept.code} (${dept.name})... `);
      const courses = await scrapeDepartment(dept.code);
      console.log(`${courses.length} courses`);

      if (courses.length > 0) {
        sectionDepts.push({ name: dept.name, prefix: dept.code, courses });
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    if (sectionDepts.length > 0) {
      result.push({ section: sectionName, departments: sectionDepts });
    }
  }

  fs.writeFileSync("./catalog.json", JSON.stringify(result, null, 2));

  const total = result.reduce(
    (acc, s) => acc + s.departments.reduce((a, d) => a + d.courses.length, 0), 0
  );

  console.log(`\n✅ Done! ${total} courses scraped.`);
  console.log(`📄 Saved to catalog.json`);
}

main().catch(console.error);