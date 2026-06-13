const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/catalog.json'));

const DEPT_TO_SCHOOL = {
  'Computer Science': 'Grove School of Engineering',
  'Electrical Engineering': 'Grove School of Engineering',
  'Mechanical Engineering': 'Grove School of Engineering',
  'Civil Engineering': 'Grove School of Engineering',
  'Chemical Engineering': 'Grove School of Engineering',
  'Biomedical Engineering': 'Grove School of Engineering',
  'General Engineering': 'Grove School of Engineering',
  'Mathematics': 'College of Liberal Arts and Science (Division of Science)',
  'Physics': 'College of Liberal Arts and Science (Division of Science)',
  'Chemistry & Biochemistry': 'College of Liberal Arts and Science (Division of Science)',
  'Biology': 'College of Liberal Arts and Science (Division of Science)',
  'Earth & Atmospheric Sciences': 'College of Liberal Arts and Science (Division of Science)',
  'General Science': 'College of Liberal Arts and Science (Division of Science)',
  'Biomedical Education': 'College of Liberal Arts and Science (Division of Science)',
  'Economics & Business': 'Colin Powell School for Civic and Global Leadership',
  'Psychology': 'Colin Powell School for Civic and Global Leadership',
  'Sociology': 'Colin Powell School for Civic and Global Leadership',
  'Political Science': 'Colin Powell School for Civic and Global Leadership',
  'Anthropology': 'Colin Powell School for Civic and Global Leadership',
  'Social Science': 'Colin Powell School for Civic and Global Leadership',
  'English': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'History': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Philosophy': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Art': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Music': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Theatre & Speech': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Humanities & Arts': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Classical & Modern Languages': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Latin American & Latino Studies': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Black Studies': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Media & Communication Arts': 'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'Interdisciplinary Arts & Sciences': 'Interdisciplinary Liberal Arts and Science - Center for Worker Education',
  'Teaching & Learning': 'School of Education',
  'Learning, Leadership & Culture': 'School of Education',
  'Education': 'School of Education',
  'Architecture': 'The Bernard and Ann Spitzer School of Architecture',
  'Urban Studies': 'The Bernard and Ann Spitzer School of Architecture',
  'CUNY Honors College': 'Student Academic Success Hub (The Hub)',
};

const COLORS = {
  'Colin Powell School for Civic and Global Leadership': '#f59e0b',
  'College of Liberal Arts and Science (Division of Humanities and the Arts)': '#ec4899',
  'College of Liberal Arts and Science (Division of Science)': '#10b981',
  'Grove School of Engineering': '#3b82f6',
  'Interdisciplinary Liberal Arts and Science - Center for Worker Education': '#06b6d4',
  'School of Education': '#f97316',
  'Student Academic Success Hub (The Hub)': '#8b5cf6',
  'The Bernard and Ann Spitzer School of Architecture': '#84cc16',
};

const ORDER = [
  'Colin Powell School for Civic and Global Leadership',
  'College of Liberal Arts and Science (Division of Humanities and the Arts)',
  'College of Liberal Arts and Science (Division of Science)',
  'Grove School of Engineering',
  'Interdisciplinary Liberal Arts and Science - Center for Worker Education',
  'School of Education',
  'Student Academic Success Hub (The Hub)',
  'The Bernard and Ann Spitzer School of Architecture',
];

const schoolMap = {};
for (const s of ORDER) schoolMap[s] = [];

for (const section of data) {
  for (const dept of section.departments) {
    const school = DEPT_TO_SCHOOL[dept.name] || 'Student Academic Success Hub (The Hub)';
    if (!schoolMap[school]) schoolMap[school] = [];
    schoolMap[school].push(dept);
  }
}

const result = ORDER
  .map(s => ({ section: s, color: COLORS[s], departments: schoolMap[s] || [] }))
  .filter(s => s.departments.length > 0);

fs.writeFileSync('data/catalog.json', JSON.stringify(result, null, 2));

let grand = 0;
for (const s of result) {
  const t = s.departments.reduce((a, d) => a + d.courses.length, 0);
  grand += t;
  console.log(s.section + ': ' + t + ' courses');
}
console.log('TOTAL: ' + grand + ' courses');
