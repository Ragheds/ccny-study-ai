"use client";

import { useState, useMemo } from "react";

// ─── REAL COURSE DATA FROM CCNY CATALOG ───────────────────────────────────────

const catalog = [
  {
    section: "Engineering",
    color: "#3b82f6",
    departments: [
      {
        name: "Computer Science",
        prefix: "CSC",
        courses: [
          { code: "CSC 10300", name: "Introduction to Computing" },
          { code: "CSC 10400", name: "Introduction to Programming" },
          { code: "CSC 21200", name: "Data Structures" },
          { code: "CSC 22000", name: "Discrete Mathematics for CS" },
          { code: "CSC 30400", name: "Analysis of Algorithms" },
          { code: "CSC 33200", name: "Theory of Computation" },
          { code: "CSC 34200", name: "Operating Systems" },
          { code: "CSC 35200", name: "Computer Organization" },
          { code: "CSC 36200", name: "Artificial Intelligence" },
          { code: "CSC 44000", name: "Programming Languages" },
          { code: "CSC 44800", name: "Machine Learning" },
          { code: "CSC 45800", name: "Computer Networks" },
          { code: "CSC 46000", name: "Database Systems" },
          { code: "CSC 47000", name: "Computer Graphics" },
          { code: "CSC 48000", name: "Senior Project" },
          { code: "CSC 59866", name: "Computer Science Research" },
        ],
      },
      {
        name: "Electrical Engineering",
        prefix: "EE",
        courses: [
          { code: "EE 10400", name: "Introduction to EE" },
          { code: "EE 21000", name: "Circuit Analysis I" },
          { code: "EE 21100", name: "Circuit Analysis II" },
          { code: "EE 22000", name: "Microelectronics I" },
          { code: "EE 30100", name: "Electromagnetics" },
          { code: "EE 31500", name: "Electronics I" },
          { code: "EE 31600", name: "Electronics II" },
          { code: "EE 32200", name: "Signals and Systems" },
          { code: "EE 33000", name: "Digital Signal Processing" },
          { code: "EE 37200", name: "Communications Systems" },
          { code: "EE 41000", name: "Senior Design I" },
          { code: "EE 42000", name: "Senior Design II" },
        ],
      },
      {
        name: "Mechanical Engineering",
        prefix: "ME",
        courses: [
          { code: "ME 10100", name: "Engineering Graphics" },
          { code: "ME 21000", name: "Statics" },
          { code: "ME 22000", name: "Dynamics" },
          { code: "ME 24200", name: "Mechanics of Materials" },
          { code: "ME 32100", name: "Thermodynamics" },
          { code: "ME 34000", name: "Fluid Mechanics" },
          { code: "ME 37300", name: "Heat Transfer" },
          { code: "ME 38600", name: "Manufacturing Processes" },
          { code: "ME 40700", name: "Machine Design" },
          { code: "ME 41000", name: "Senior Design I" },
          { code: "ME 42000", name: "Senior Design II" },
        ],
      },
      {
        name: "Civil Engineering",
        prefix: "CE",
        courses: [
          { code: "CE 10200", name: "Introduction to Civil Engineering" },
          { code: "CE 21000", name: "Statics" },
          { code: "CE 24200", name: "Mechanics of Materials" },
          { code: "CE 32700", name: "Structural Analysis" },
          { code: "CE 34000", name: "Fluid Mechanics" },
          { code: "CE 35200", name: "Soil Mechanics" },
          { code: "CE 35700", name: "Transportation Engineering" },
          { code: "CE 36200", name: "Structural Design" },
          { code: "CE 41000", name: "Senior Design I" },
          { code: "CE 42000", name: "Senior Design II" },
        ],
      },
      {
        name: "Chemical Engineering",
        prefix: "CHE",
        courses: [
          { code: "CHE 20300", name: "Material and Energy Balances" },
          { code: "CHE 31000", name: "Thermodynamics I" },
          { code: "CHE 32000", name: "Fluid Mechanics" },
          { code: "CHE 33000", name: "Heat Transfer" },
          { code: "CHE 34000", name: "Mass Transfer" },
          { code: "CHE 35000", name: "Reaction Engineering" },
          { code: "CHE 41000", name: "Process Design I" },
          { code: "CHE 42000", name: "Process Design II" },
          { code: "CHE 43000", name: "Process Control" },
        ],
      },
      {
        name: "Biomedical Engineering",
        prefix: "BME",
        courses: [
          { code: "BME 20100", name: "Introduction to Biomedical Engineering" },
          { code: "BME 30100", name: "Biomechanics" },
          { code: "BME 30200", name: "Biomedical Signals and Systems" },
          { code: "BME 30300", name: "Biomaterials" },
          { code: "BME 30400", name: "Physiology for Engineers" },
          { code: "BME 40100", name: "Biomedical Instrumentation" },
          { code: "BME 41000", name: "Senior Design I" },
          { code: "BME 42000", name: "Senior Design II" },
        ],
      },
      {
        name: "General Engineering",
        prefix: "ENGR",
        courses: [
          { code: "ENGR 10100", name: "Introduction to Engineering" },
          { code: "ENGR 10200", name: "Data Science and Statistical Programming" },
          { code: "ENGR 20200", name: "Bridge to C++" },
          { code: "ENGR 21000", name: "Engineering Analysis" },
          { code: "ENGR 30200", name: "Engineering Ethics" },
        ],
      },
    ],
  },

  {
    section: "Sciences",
    color: "#10b981",
    departments: [
      {
        name: "Mathematics",
        prefix: "MATH",
        courses: [
          { code: "MATH 19500", name: "Precalculus" },
          { code: "MATH 20100", name: "Calculus I" },
          { code: "MATH 20200", name: "Calculus II" },
          { code: "MATH 20300", name: "Calculus III" },
          { code: "MATH 20900", name: "Discrete Mathematics" },
          { code: "MATH 31500", name: "Introduction to Pure Mathematics" },
          { code: "MATH 32000", name: "Linear Algebra" },
          { code: "MATH 33400", name: "Abstract Algebra I" },
          { code: "MATH 33500", name: "Abstract Algebra II" },
          { code: "MATH 34600", name: "Probability" },
          { code: "MATH 34700", name: "Mathematical Statistics" },
          { code: "MATH 36500", name: "Real Analysis I" },
          { code: "MATH 36600", name: "Real Analysis II" },
          { code: "MATH 38200", name: "Ordinary Differential Equations" },
          { code: "MATH 39200", name: "Numerical Analysis" },
        ],
      },
      {
        name: "Physics",
        prefix: "PHY",
        courses: [
          { code: "PHY 20700", name: "Physics I – Mechanics" },
          { code: "PHY 20800", name: "Physics II – Electricity & Magnetism" },
          { code: "PHY 20900", name: "Physics III – Waves & Modern Physics" },
          { code: "PHY 30100", name: "Classical Mechanics" },
          { code: "PHY 30200", name: "Electromagnetic Theory" },
          { code: "PHY 30300", name: "Quantum Mechanics I" },
          { code: "PHY 31000", name: "Mathematical Methods" },
          { code: "PHY 32000", name: "Statistical Mechanics" },
          { code: "PHY 40100", name: "Quantum Mechanics II" },
          { code: "PHY 40200", name: "Solid State Physics" },
          { code: "PHY 49000", name: "Senior Research" },
        ],
      },
      {
        name: "Chemistry & Biochemistry",
        prefix: "CHEM",
        courses: [
          { code: "CHEM 10300", name: "General Chemistry I" },
          { code: "CHEM 10400", name: "General Chemistry II" },
          { code: "CHEM 26100", name: "Organic Chemistry I" },
          { code: "CHEM 26200", name: "Organic Chemistry II" },
          { code: "CHEM 31100", name: "Physical Chemistry I" },
          { code: "CHEM 31200", name: "Physical Chemistry II" },
          { code: "CHEM 32100", name: "Biochemistry I" },
          { code: "CHEM 32200", name: "Biochemistry II" },
          { code: "CHEM 33100", name: "Analytical Chemistry" },
          { code: "CHEM 34100", name: "Inorganic Chemistry" },
          { code: "CHEM 37000", name: "Advanced Organic Chemistry" },
          { code: "CHEM 49000", name: "Senior Research" },
        ],
      },
      {
        name: "Biology",
        prefix: "BIO",
        courses: [
          { code: "BIO 10000", name: "Principles of Biology" },
          { code: "BIO 10100", name: "General Biology I" },
          { code: "BIO 10200", name: "General Biology II" },
          { code: "BIO 20200", name: "Genetics" },
          { code: "BIO 20300", name: "Cell Biology" },
          { code: "BIO 20600", name: "Microbiology" },
          { code: "BIO 30100", name: "Ecology" },
          { code: "BIO 30200", name: "Evolution" },
          { code: "BIO 30300", name: "Animal Physiology" },
          { code: "BIO 30400", name: "Molecular Biology" },
          { code: "BIO 31500", name: "Developmental Biology" },
          { code: "BIO 32000", name: "Neurobiology" },
          { code: "BIO 49000", name: "Senior Research" },
        ],
      },
      {
        name: "Earth & Atmospheric Sciences",
        prefix: "EAS",
        courses: [
          { code: "EAS 10600", name: "Introduction to Meteorology" },
          { code: "EAS 10700", name: "Introduction to Geology" },
          { code: "EAS 20600", name: "Environmental Science" },
          { code: "EAS 21500", name: "Oceanography" },
          { code: "EAS 30600", name: "Atmospheric Dynamics" },
          { code: "EAS 31500", name: "Climate Science" },
          { code: "EAS 32000", name: "Remote Sensing" },
          { code: "EAS 33000", name: "Hydrology" },
          { code: "EAS 40000", name: "Senior Research" },
        ],
      },
    ],
  },

  {
    section: "Social Sciences",
    color: "#f59e0b",
    departments: [
      {
        name: "Economics & Business",
        prefix: "ECO",
        courses: [
          { code: "ECO 10001", name: "Introduction to Financial Management" },
          { code: "ECO 10002", name: "Mathematical Methods for Economics and Business" },
          { code: "ECO 10050", name: "Startups: An Experiential Exercise" },
          { code: "ECO 10150", name: "Principles of Management" },
          { code: "ECO 10250", name: "Principles of Microeconomics" },
          { code: "ECO 10300", name: "Principles of Macroeconomics" },
          { code: "ECO 10350", name: "Principles of Macroeconomics (Honors)" },
          { code: "ECO 10400", name: "Introduction to Quantitative Economics" },
          { code: "ECO 15500", name: "Introduction to Entrepreneurship" },
          { code: "ECO 19150", name: "Honors Introduction to Economics" },
          { code: "ECO 20050", name: "Design Thinking" },
          { code: "ECO 20150", name: "Principles of Statistics" },
          { code: "ECO 20250", name: "Intermediate Microeconomics" },
          { code: "ECO 20350", name: "Intermediate Macroeconomics" },
          { code: "ECO 20450", name: "Principles of Accounting I" },
          { code: "ECO 21150", name: "Consumer Behavior" },
          { code: "ECO 21250", name: "Principles of Marketing" },
          { code: "ECO 21350", name: "International Business Environment" },
          { code: "ECO 21450", name: "Business Law" },
          { code: "ECO 21650", name: "Financial Analysis & Decision Making I" },
          { code: "ECO 21660", name: "Fundamentals of Business Communication" },
          { code: "ECO 22250", name: "Corporate Finance" },
          { code: "ECO 22350", name: "Economics of Investments" },
          { code: "ECO 23150", name: "Environmental Economics & Sustainability" },
          { code: "ECO 23350", name: "Economic History" },
          { code: "ECO 23450", name: "Law & Economics" },
          { code: "ECO 24200", name: "Financial Analysis & Decision Making II" },
          { code: "ECO 24800", name: "Aligning Profit and Purpose" },
          { code: "ECO 24900", name: "Entrepreneurship at the Base" },
          { code: "ECO 25200", name: "Nonprofit Management" },
          { code: "ECO 26400", name: "Public Finance" },
          { code: "ECO 30050", name: "Entrepreneurial Finance" },
          { code: "ECO 31113", name: "Artificial Intelligence in Business" },
          { code: "ECO 31123", name: "AI and Entrepreneurship" },
          { code: "ECO 31124", name: "Master Your Money: Financial Skills for a Lifetime" },
          { code: "ECO 31125", name: "Global Financial Risk Management" },
          { code: "ECO 31126", name: "Health Economics and Policy" },
          { code: "ECO 31127", name: "Artificial Intelligence and Machine Learning" },
          { code: "ECO 31183", name: "Introduction to Venture Capital Finance" },
          { code: "ECO 31250", name: "Human Resources Management" },
          { code: "ECO 31650", name: "Organizational Behavior" },
          { code: "ECO 31963", name: "Economic Inequality" },
          { code: "ECO 32150", name: "International Finance" },
          { code: "ECO 32350", name: "Principles of Accounting II" },
          { code: "ECO 32500", name: "Python for Business Analytics" },
          { code: "ECO 32600", name: "Diversity, Equity and Inclusion at Work" },
          { code: "ECO 32700", name: "Financial Modeling" },
          { code: "ECO 33150", name: "Introduction to Econometrics" },
          { code: "ECO 33350", name: "Macroeconomics II" },
          { code: "ECO 33450", name: "International Trade Theory" },
          { code: "ECO 33550", name: "Urban Economics" },
          { code: "ECO 33850", name: "Public Economics" },
          { code: "ECO 33950", name: "Behavioral Economics" },
          { code: "ECO 34150", name: "Entrepreneurship: Women & Diversity" },
          { code: "ECO 34200", name: "Social Entrepreneurship" },
          { code: "ECO 34350", name: "Internet Marketing: Strategic SEO and SEM" },
          { code: "ECO 34450", name: "Money and Banking" },
          { code: "ECO 34500", name: "Supply Chain Management" },
          { code: "ECO 34600", name: "Economics of Social Mobility" },
          { code: "ECO 35650", name: "Python for Data Analytics" },
          { code: "ECO 35800", name: "Business and Society" },
          { code: "ECO 36300", name: "Developing Management Skills" },
          { code: "ECO 37700", name: "Social Innovation and Entrepreneurship" },
          { code: "ECO 40050", name: "Managerial and Cost Accounting" },
          { code: "ECO 41150", name: "Strategic Management" },
          { code: "ECO 41151", name: "Business Case Analysis & Presentations" },
          { code: "ECO 41250", name: "Entrepreneurship" },
          { code: "ECO 41450", name: "Information and Technology Management" },
          { code: "ECO 41550", name: "Advanced Financial Analysis and Decision Making II" },
          { code: "ECO 42000", name: "Internship" },
          { code: "ECO 42250", name: "Options and Futures" },
          { code: "ECO 43000", name: "Quantitative Finance" },
          { code: "ECO 43150", name: "Industrial Organization and Public Policy" },
          { code: "ECO 43250", name: "Economic Development" },
          { code: "ECO 43350", name: "Labor Economics" },
          { code: "ECO 43550", name: "Econometrics II" },
          { code: "ECO 44000", name: "Financial Analysis Workshop" },
          { code: "ECO 46000", name: "Introduction to Game Theory" },
          { code: "ECO 49500", name: "Topics in Entrepreneurship" },
        ],
      },
      {
        name: "Psychology",
        prefix: "PSY",
        courses: [
          { code: "PSY 10000", name: "Introduction to Psychology" },
          { code: "PSY 21000", name: "Research Methods in Psychology" },
          { code: "PSY 21500", name: "Statistics for Psychology" },
          { code: "PSY 22000", name: "Developmental Psychology" },
          { code: "PSY 23000", name: "Abnormal Psychology" },
          { code: "PSY 24000", name: "Social Psychology" },
          { code: "PSY 25000", name: "Cognitive Psychology" },
          { code: "PSY 26000", name: "Biopsychology" },
          { code: "PSY 31000", name: "Advanced Research Methods" },
          { code: "PSY 32000", name: "Sensation and Perception" },
          { code: "PSY 33000", name: "Learning and Memory" },
          { code: "PSY 34000", name: "Personality" },
          { code: "PSY 35000", name: "Health Psychology" },
          { code: "PSY 36000", name: "Industrial-Organizational Psychology" },
          { code: "PSY 40000", name: "Senior Seminar" },
          { code: "PSY 41000", name: "Internship in Psychology" },
        ],
      },
      {
        name: "Sociology",
        prefix: "SOC",
        courses: [
          { code: "SOC 10000", name: "Introduction to Sociology" },
          { code: "SOC 20100", name: "Social Theory" },
          { code: "SOC 20200", name: "Social Research Methods" },
          { code: "SOC 20300", name: "Statistics for Social Research" },
          { code: "SOC 21000", name: "Urban Sociology" },
          { code: "SOC 22000", name: "Race and Ethnicity" },
          { code: "SOC 23000", name: "Gender and Society" },
          { code: "SOC 24000", name: "Crime and Deviance" },
          { code: "SOC 30100", name: "Contemporary Social Theory" },
          { code: "SOC 31000", name: "Sociology of Work" },
          { code: "SOC 32000", name: "Political Sociology" },
          { code: "SOC 33000", name: "Medical Sociology" },
          { code: "SOC 40000", name: "Senior Seminar" },
        ],
      },
      {
        name: "Political Science",
        prefix: "PSC",
        courses: [
          { code: "PSC 10000", name: "Introduction to Political Science" },
          { code: "PSC 20100", name: "American Government" },
          { code: "PSC 20200", name: "Comparative Politics" },
          { code: "PSC 20300", name: "International Relations" },
          { code: "PSC 20400", name: "Political Theory" },
          { code: "PSC 21000", name: "Research Methods in Political Science" },
          { code: "PSC 30100", name: "American Foreign Policy" },
          { code: "PSC 30200", name: "Political Economy" },
          { code: "PSC 31000", name: "Public Policy" },
          { code: "PSC 32000", name: "Human Rights" },
          { code: "PSC 33000", name: "Constitutional Law" },
          { code: "PSC 40000", name: "Senior Seminar" },
        ],
      },
      {
        name: "Anthropology & Interdisciplinary Programs",
        prefix: "ANTH",
        courses: [
          { code: "ANTH 10100", name: "Introduction to Anthropology" },
          { code: "ANTH 10101", name: "General Anthropology – Honors" },
          { code: "ANTH 20000", name: "Archaeology: The Past in the Present" },
          { code: "ANTH 20100", name: "Cross-Cultural Perspectives" },
          { code: "ANTH 20200", name: "Language in Cross-Cultural Perspective" },
          { code: "ANTH 20300", name: "Human Origins" },
          { code: "ANTH 20500", name: "Topics in Historical Archaeology" },
          { code: "ANTH 22500", name: "Class, Ethnicity and Gender" },
          { code: "ANTH 22800", name: "Anthropology of Urban Areas" },
          { code: "ANTH 22900", name: "Cultural Change and Modernization" },
          { code: "ANTH 23100", name: "Anthropology of Law" },
          { code: "ANTH 23200", name: "Witchcraft, Magic and Religion" },
          { code: "ANTH 23600", name: "Anthropology of Gender & Sexuality" },
          { code: "ANTH 23800", name: "Bio-Cultural Anthropology" },
          { code: "ANTH 24000", name: "African Societies and Cultures" },
          { code: "ANTH 24200", name: "Caribbean Societies and Cultures" },
          { code: "ANTH 24300", name: "Latin American Societies and Cultures" },
          { code: "ANTH 24600", name: "Middle Eastern and North African Societies" },
          { code: "ANTH 24800", name: "Field Work Methods in Cultural Anthropology" },
          { code: "ANTH 25400", name: "American Cultural Patterns" },
          { code: "ANTH 25500", name: "Anthropology of Health and Healing" },
          { code: "ANTH 25700", name: "Anthropology of Childhood" },
          { code: "ANTH 26500", name: "Language and Power" },
          { code: "ANTH 27300", name: "Black English: Structure and Use" },
          { code: "ANTH 32100", name: "Health Issues and Alternatives" },
          { code: "ANTH 32200", name: "Immigrant and Refugee Movements and Cultures" },
          { code: "ANTH 32300", name: "Islamic Cultures and Issues" },
          { code: "ANTH 32400", name: "Violation of Human Rights" },
          { code: "ANTH 32459", name: "Criminalization and Mass Incarceration" },
          { code: "ANTH 32500", name: "Anthropology of War & Trauma" },
          { code: "ANTH 33000", name: "Contemporary Culture Theory" },
          { code: "ANTH 33100", name: "History of Anthropological Theory" },
          { code: "ANTH 35000", name: "Race and Racism" },
          { code: "ANTH 35100", name: "Anthropological Genomics" },
        ],
      },
    ],
  },

  {
    section: "Humanities & Arts",
    color: "#ec4899",
    departments: [
      {
        name: "English",
        prefix: "ENGL",
        courses: [
          { code: "ENGL 11000", name: "Composition I" },
          { code: "ENGL 21003", name: "Composition II" },
          { code: "ENGL 21500", name: "Introduction to Literary Studies" },
          { code: "ENGL 22000", name: "British Literature I" },
          { code: "ENGL 22100", name: "British Literature II" },
          { code: "ENGL 22200", name: "American Literature I" },
          { code: "ENGL 22300", name: "American Literature II" },
          { code: "ENGL 30100", name: "Shakespeare" },
          { code: "ENGL 30200", name: "The Novel" },
          { code: "ENGL 30300", name: "Poetry" },
          { code: "ENGL 31000", name: "Literary Theory & Criticism" },
          { code: "ENGL 31500", name: "Creative Writing: Fiction" },
          { code: "ENGL 31600", name: "Creative Writing: Poetry" },
          { code: "ENGL 32000", name: "African American Literature" },
          { code: "ENGL 33000", name: "World Literature" },
          { code: "ENGL 40000", name: "Senior Seminar" },
        ],
      },
      {
        name: "History",
        prefix: "HIST",
        courses: [
          { code: "HIST 10100", name: "World History I" },
          { code: "HIST 10200", name: "World History II" },
          { code: "HIST 20100", name: "US History I" },
          { code: "HIST 20200", name: "US History II" },
          { code: "HIST 20300", name: "Historical Methods" },
          { code: "HIST 21000", name: "African History" },
          { code: "HIST 22000", name: "Latin American History" },
          { code: "HIST 23000", name: "European History" },
          { code: "HIST 24000", name: "Asian History" },
          { code: "HIST 30100", name: "New York City History" },
          { code: "HIST 31000", name: "Historiography" },
          { code: "HIST 32000", name: "History of Science and Technology" },
          { code: "HIST 40000", name: "Senior Seminar" },
        ],
      },
      {
        name: "Philosophy",
        prefix: "PHIL",
        courses: [
          { code: "PHIL 10100", name: "Introduction to Philosophy" },
          { code: "PHIL 10200", name: "Logic" },
          { code: "PHIL 20100", name: "Ancient Philosophy" },
          { code: "PHIL 20200", name: "Modern Philosophy" },
          { code: "PHIL 20300", name: "Ethics" },
          { code: "PHIL 20400", name: "Epistemology" },
          { code: "PHIL 30100", name: "Metaphysics" },
          { code: "PHIL 30200", name: "Philosophy of Science" },
          { code: "PHIL 30300", name: "Philosophy of Mind" },
          { code: "PHIL 31000", name: "Social and Political Philosophy" },
          { code: "PHIL 40000", name: "Senior Seminar" },
        ],
      },
      {
        name: "Art",
        prefix: "ART",
        courses: [
          { code: "ART 10100", name: "Drawing I" },
          { code: "ART 10200", name: "2D Design" },
          { code: "ART 10300", name: "3D Design" },
          { code: "ART 20100", name: "Drawing II" },
          { code: "ART 20200", name: "Art History I: Ancient to Medieval" },
          { code: "ART 20300", name: "Art History II: Renaissance to Modern" },
          { code: "ART 21000", name: "Painting I" },
          { code: "ART 22000", name: "Sculpture I" },
          { code: "ART 23000", name: "Printmaking I" },
          { code: "ART 30100", name: "Painting II" },
          { code: "ART 30200", name: "Contemporary Art History" },
          { code: "ART 40000", name: "Senior Thesis Exhibition" },
        ],
      },
      {
        name: "Music",
        prefix: "MUS",
        courses: [
          { code: "MUS 10100", name: "Music Theory I" },
          { code: "MUS 10200", name: "Ear Training I" },
          { code: "MUS 10300", name: "Introduction to Popular Music" },
          { code: "MUS 20100", name: "Music Theory II" },
          { code: "MUS 20200", name: "Ear Training II" },
          { code: "MUS 20300", name: "Jazz History" },
          { code: "MUS 20500", name: "Music Technology I" },
          { code: "MUS 20600", name: "Music Industry Overview" },
          { code: "MUS 30100", name: "Jazz Harmony & Improvisation I" },
          { code: "MUS 30200", name: "Jazz Arranging" },
          { code: "MUS 30500", name: "Music Production" },
          { code: "MUS 40000", name: "Senior Recital" },
        ],
      },
      {
        name: "Theatre & Speech",
        prefix: "THSP",
        courses: [
          { code: "THSP 10100", name: "Introduction to Theatre" },
          { code: "THSP 10200", name: "Acting I" },
          { code: "THSP 20100", name: "Theatre History I" },
          { code: "THSP 20200", name: "Theatre History II" },
          { code: "THSP 20300", name: "Acting II" },
          { code: "THSP 20400", name: "Stagecraft" },
          { code: "THSP 30100", name: "Directing I" },
          { code: "THSP 30200", name: "Playwriting" },
          { code: "THSP 30300", name: "Voice and Movement" },
          { code: "THSP 40000", name: "Senior Production" },
        ],
      },
    ],
  },

  {
    section: "Media & Communications",
    color: "#8b5cf6",
    departments: [
      {
        name: "Media & Communication Arts",
        prefix: "MCA",
        courses: [
          { code: "MCA 10100", name: "Introduction to Media & Communication" },
          { code: "MCA 20100", name: "Media Writing" },
          { code: "MCA 20200", name: "Media History & Theory" },
          { code: "MCA 20300", name: "Introduction to Journalism" },
          { code: "MCA 20400", name: "Digital Media Production" },
          { code: "MCA 21000", name: "Photography I" },
          { code: "MCA 22000", name: "Video Production I" },
          { code: "MCA 23000", name: "Audio Production" },
          { code: "MCA 30100", name: "Advanced Journalism" },
          { code: "MCA 30200", name: "Documentary Production" },
          { code: "MCA 30300", name: "Media Law & Ethics" },
          { code: "MCA 31000", name: "Media Research Methods" },
          { code: "MCA 32000", name: "Social Media Strategy" },
          { code: "MCA 40000", name: "Senior Portfolio" },
        ],
      },
      {
        name: "Film",
        prefix: "FILM",
        courses: [
          { code: "FILM 10100", name: "Introduction to Film Studies" },
          { code: "FILM 20100", name: "Film History I" },
          { code: "FILM 20200", name: "Film History II" },
          { code: "FILM 20300", name: "Screenwriting I" },
          { code: "FILM 20400", name: "Film Production I" },
          { code: "FILM 30100", name: "Film Production II" },
          { code: "FILM 30200", name: "Documentary Film" },
          { code: "FILM 30300", name: "Screenwriting II" },
          { code: "FILM 30400", name: "Film Theory" },
          { code: "FILM 40000", name: "Senior Thesis Film" },
        ],
      },
      {
        name: "Electronic Design & Multimedia",
        prefix: "EDM",
        courses: [
          { code: "EDM 20100", name: "Digital Design I" },
          { code: "EDM 20200", name: "Typography" },
          { code: "EDM 20300", name: "Web Design I" },
          { code: "EDM 30100", name: "Interactive Design" },
          { code: "EDM 30200", name: "Motion Graphics" },
          { code: "EDM 30300", name: "UX/UI Design" },
          { code: "EDM 40000", name: "Senior Thesis Portfolio" },
        ],
      },
    ],
  },

  {
    section: "Languages",
    color: "#06b6d4",
    departments: [
      {
        name: "Classical & Modern Languages",
        prefix: "LANG",
        courses: [
          { code: "SPAN 10100", name: "Elementary Spanish I" },
          { code: "SPAN 10200", name: "Elementary Spanish II" },
          { code: "SPAN 20100", name: "Intermediate Spanish I" },
          { code: "SPAN 20200", name: "Intermediate Spanish II" },
          { code: "SPAN 30100", name: "Advanced Spanish Composition" },
          { code: "SPAN 30200", name: "Spanish Literature I" },
          { code: "FREN 10100", name: "Elementary French I" },
          { code: "FREN 10200", name: "Elementary French II" },
          { code: "FREN 20100", name: "Intermediate French I" },
          { code: "FREN 20200", name: "Intermediate French II" },
          { code: "FREN 30100", name: "Advanced French Composition" },
          { code: "CHIN 10100", name: "Elementary Chinese I" },
          { code: "CHIN 10200", name: "Elementary Chinese II" },
          { code: "CHIN 20100", name: "Intermediate Chinese I" },
          { code: "ARAB 10100", name: "Elementary Arabic I" },
          { code: "ARAB 10200", name: "Elementary Arabic II" },
          { code: "RUSS 10100", name: "Elementary Russian I" },
          { code: "RUSS 10200", name: "Elementary Russian II" },
        ],
      },
      {
        name: "Latin American & Latino Studies",
        prefix: "LALS",
        courses: [
          { code: "LALS 10100", name: "Introduction to the Spanish-Speaking Caribbean" },
          { code: "LALS 10200", name: "Introduction to Latin American Studies" },
          { code: "LALS 12200", name: "Puerto Rican Heritage: 1898 to Present" },
          { code: "LALS 12300", name: "Dominican Heritage" },
          { code: "LALS 12600", name: "Introduction to Latina/o/x Studies and Immigration" },
          { code: "LALS 13100", name: "The Hispanic Child in the Urban Environment" },
          { code: "LALS 22600", name: "Antillean Literature" },
          { code: "LALS 29100", name: "Culture and Health: Hispanics and Other Minorities" },
          { code: "LALS 31301", name: "Puerto Ricans and Dominicans in Urban America" },
        ],
      },
      {
        name: "International & Global Studies",
        prefix: "INTL",
        courses: [
          { code: "INTL 10100", name: "Introduction to International & Global Studies" },
          { code: "INTL 20600", name: "Global Social Theory" },
          { code: "INTL 21018", name: "Global Governance and International Organizations" },
          { code: "INTL 22200", name: "Demystifying Diplomacy" },
          { code: "INTL 22300", name: "Disaster Capitalism" },
          { code: "INTL 22400", name: "Global Cities" },
          { code: "INTL 22500", name: "Media and Democracy" },
          { code: "INTL 22700", name: "Model United Nations I" },
          { code: "INTL 25100", name: "Internship in International Studies" },
          { code: "INTL 30800", name: "Research Methods in International & Global Studies" },
          { code: "INTL 31406", name: "Model United Nations II" },
          { code: "INTL 32100", name: "Senior Seminar in International & Global Studies" },
          { code: "INTL 32200", name: "Senior Essay in International & Global Studies" },
          { code: "INTL 32500", name: "Professionalization in International & Global Studies" },
          { code: "INTL 33200", name: "Transnational Feminisms" },
        ],
      },
      {
        name: "Women's & Gender Studies",
        prefix: "WS",
        courses: [
          { code: "WS 10000", name: "Women's Gender Roles in Contemporary Society" },
          { code: "WS 31141", name: "SPEAK UP! Addressing Gender-Based Harm" },
          { code: "WS 31164", name: "Being Queer, Being Trans" },
          { code: "WS 31189", name: "Feminist & Queer Theory & Practice" },
          { code: "WS 31671", name: "Law, Policy, and Social Change" },
          { code: "WS 33200", name: "Transnational Feminisms" },
          { code: "WS 34150", name: "Entrepreneurship: Women & Diversity" },
          { code: "WS 34500", name: "Political Writing and Project Development" },
        ],
      },
    ],
  },

  {
    section: "Education",
    color: "#f97316",
    departments: [
      {
        name: "Teaching & Learning",
        prefix: "EDUC",
        courses: [
          { code: "EDUC 10000", name: "Introduction to Education" },
          { code: "EDUC 20100", name: "Child Development" },
          { code: "EDUC 20200", name: "Foundations of Bilingual Education" },
          { code: "EDUC 20300", name: "Curriculum & Instruction I" },
          { code: "EDUC 30100", name: "Methods of Teaching – Literacy" },
          { code: "EDUC 30200", name: "Methods of Teaching – Mathematics" },
          { code: "EDUC 30300", name: "Methods of Teaching – Science & Social Studies" },
          { code: "EDUC 30400", name: "Bilingual Methods" },
          { code: "EDUC 30500", name: "Special Education Inclusion" },
          { code: "EDUC 40100", name: "Student Teaching Seminar" },
          { code: "EDUC 40200", name: "Student Teaching I" },
          { code: "EDUC 40300", name: "Student Teaching II" },
        ],
      },
      {
        name: "Learning, Leadership & Culture",
        prefix: "LRLDC",
        courses: [
          { code: "LRLDC 10100", name: "Introduction to Urban Education" },
          { code: "LRLDC 20100", name: "History of American Education" },
          { code: "LRLDC 20200", name: "Educational Psychology" },
          { code: "LRLDC 30100", name: "Education Policy" },
          { code: "LRLDC 30200", name: "Leadership in Education" },
          { code: "LRLDC 40000", name: "Senior Seminar in Education" },
        ],
      },
    ],
  },

  {
    section: "Architecture",
    color: "#84cc16",
    departments: [
      {
        name: "Architecture",
        prefix: "ARCH",
        courses: [
          { code: "ARCH 10100", name: "Architectural Design I" },
          { code: "ARCH 10200", name: "Drawing & Representation I" },
          { code: "ARCH 10300", name: "Introduction to Architecture" },
          { code: "ARCH 20100", name: "Architectural Design II" },
          { code: "ARCH 20200", name: "Drawing & Representation II" },
          { code: "ARCH 20300", name: "Structures I" },
          { code: "ARCH 20400", name: "History of Architecture I" },
          { code: "ARCH 30100", name: "Architectural Design III" },
          { code: "ARCH 30200", name: "Structures II" },
          { code: "ARCH 30300", name: "History of Architecture II" },
          { code: "ARCH 30400", name: "Environmental Systems" },
          { code: "ARCH 30500", name: "Urban Design" },
          { code: "ARCH 40100", name: "Architectural Design IV" },
          { code: "ARCH 40200", name: "Construction Technology" },
          { code: "ARCH 40300", name: "Professional Practice" },
          { code: "ARCH 50100", name: "Thesis Design I" },
          { code: "ARCH 50200", name: "Thesis Design II" },
        ],
      },
      {
        name: "Urban Studies",
        prefix: "URBS",
        courses: [
          { code: "URBS 10100", name: "Introduction to Urban Studies" },
          { code: "URBS 20100", name: "Urban History" },
          { code: "URBS 20200", name: "Urban Planning" },
          { code: "URBS 30100", name: "Urban Policy & Politics" },
          { code: "URBS 30200", name: "Housing & Community Development" },
          { code: "URBS 30300", name: "GIS & Urban Analysis" },
          { code: "URBS 40000", name: "Senior Capstone" },
          { code: "URBS 40100", name: "Urban Research Project" },
        ],
      },
    ],
  },

  {
    section: "Interdisciplinary",
    color: "#e11d48",
    departments: [
      {
        name: "Black Studies",
        prefix: "BLST",
        courses: [
          { code: "BLST 10100", name: "Introduction to Black Studies" },
          { code: "BLST 20100", name: "African American History I" },
          { code: "BLST 20200", name: "African American History II" },
          { code: "BLST 20300", name: "African Diaspora Studies" },
          { code: "BLST 20400", name: "Black Political Thought" },
          { code: "BLST 30100", name: "The Black Arts Movement" },
          { code: "BLST 30200", name: "Black Film Studies" },
          { code: "BLST 31000", name: "Research Methods in Black Studies" },
          { code: "BLST 40000", name: "Senior Seminar" },
        ],
      },
      {
        name: "Interdisciplinary Arts & Sciences",
        prefix: "IAS",
        courses: [
          { code: "IAS 10300", name: "The Natural World" },
          { code: "IAS 10400", name: "The Social World" },
          { code: "IAS 20100", name: "Critical Thinking and Writing" },
          { code: "IAS 20200", name: "Quantitative Reasoning" },
          { code: "IAS 30100", name: "Interdisciplinary Research Methods" },
          { code: "IAS 40000", name: "Senior Capstone" },
        ],
      },
      {
        name: "Digital Game Development",
        prefix: "DIGGM",
        courses: [
          { code: "DIGGM 20100", name: "Introduction to Game Design" },
          { code: "DIGGM 20200", name: "Game Programming I" },
          { code: "DIGGM 30100", name: "Game Programming II" },
          { code: "DIGGM 30200", name: "3D Modeling for Games" },
          { code: "DIGGM 30300", name: "Game Narrative & Level Design" },
          { code: "DIGGM 40000", name: "Senior Game Project" },
        ],
      },
    ],
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function CourseCatalogPage() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleCourse = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return catalog
      .map((section) => ({
        ...section,
        departments: section.departments
          .map((dept) => ({
            ...dept,
            courses: dept.courses.filter(
              (c) =>
                c.code.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q)
            ),
          }))
          .filter((dept) => dept.courses.length > 0),
      }))
      .filter(
        (section) =>
          section.departments.length > 0 &&
          (activeSection === null || section.section === activeSection)
      );
  }, [query, activeSection]);

  const totalCourses = catalog.reduce(
    (acc, s) => acc + s.departments.reduce((a, d) => a + d.courses.length, 0),
    0
  );

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {totalCourses}+ courses across all CCNY departments
              </p>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-400 font-medium">
                  {selected.size} selected
                </span>
                <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                  Add to My Courses
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search by course code or name... (e.g. CSC 10300, Data Structures)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-white/20 focus:bg-white/8 transition text-sm placeholder:text-gray-600"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Section filter pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveSection(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                activeSection === null
                  ? "bg-white text-black border-white"
                  : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
              }`}
            >
              All
            </button>
            {catalog.map((s) => (
              <button
                key={s.section}
                onClick={() =>
                  setActiveSection(
                    activeSection === s.section ? null : s.section
                  )
                }
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition`}
                style={
                  activeSection === s.section
                    ? {
                        backgroundColor: s.color,
                        borderColor: s.color,
                        color: "white",
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#9ca3af",
                      }
                }
              >
                {s.section}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-16">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            No courses found for &ldquo;{query}&rdquo;
          </div>
        )}

        {filtered.map((section) => (
          <div key={section.section}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: section.color }}
              />
              <h2 className="text-2xl font-bold">{section.section}</h2>
              <span className="text-gray-600 text-sm">
                {section.departments.reduce(
                  (a, d) => a + d.courses.length,
                  0
                )}{" "}
                courses
              </span>
            </div>

            {/* Departments */}
            <div className="space-y-8">
              {section.departments.map((dept) => (
                <div key={dept.name}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                    {dept.name}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {dept.courses.map((course) => {
                      const isSelected = selected.has(course.code);
                      return (
                        <button
                          key={course.code}
                          onClick={() => toggleCourse(course.code)}
                          className={`group text-left rounded-xl border px-4 py-3 transition-all ${
                            isSelected
                              ? "border-blue-500/60 bg-blue-500/10"
                              : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className="text-xs font-mono font-bold mb-1"
                                style={{ color: section.color }}
                              >
                                {course.code}
                              </p>
                              <p className="text-sm text-gray-300 leading-snug line-clamp-2">
                                {course.name}
                              </p>
                            </div>
                            <div
                              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-white/20 group-hover:border-white/40"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky bottom bar when courses are selected */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-white/10 px-6 py-4 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{selected.size} course{selected.size !== 1 ? "s" : ""}</span> selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-gray-500 hover:text-white transition px-4 py-2"
              >
                Clear
              </button>
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2 rounded-xl transition">
                Add to My Courses →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}