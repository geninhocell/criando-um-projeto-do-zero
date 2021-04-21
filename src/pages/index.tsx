import Head from 'next/head';
import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useState } from 'react';
import Header from '../components/Header';
import { getPrismicClient } from '../services/prismic';

// import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [pagination, setPagination] = useState(() => postsPagination.next_page);

  const [posts, setPosts] = useState(() => postsPagination.results);

  function dateFormatted(date: string): string {
    return format(new Date(date), "dd' 'LLL' 'yyyy", {
      locale: ptBR,
    });
  }

  const handleLoad = async (): Promise<void> => {
    fetch(pagination)
      .then(response => response.json())
      .then((data: PostPagination) => {
        setPagination(data.next_page);
        setPosts([...posts, ...data.results]);
      });
  };

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Header />

      <div className={styles.container}>
        {posts.map(post => (
          <Link key={post.uid} href={`/post/${post.uid}`}>
            <a>
              <h1>{post.data.title}</h1>
              <h2>{post.data.subtitle}</h2>
              <div className={styles.footer}>
                <div>
                  <FiCalendar size={15} />
                  {dateFormatted(post.first_publication_date)}
                </div>

                <div>
                  <FiUser />
                  {post.data.author}
                </div>
              </div>
            </a>
          </Link>
        ))}
        {!!pagination && (
          <button className={styles.button} type="button" onClick={handleLoad}>
            Carregar mais posts
          </button>
        )}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 1,
      ref: previewData?.ref ?? null,
    }
  );

  const posts = postsResponse.results.map(post => ({
    uid: post.uid,
    first_publication_date: post.first_publication_date,
    data: {
      title: post.data.title,
      subtitle: post.data.subtitle,
      author: post.data.author,
    },
  }));

  const { next_page } = postsResponse;

  return {
    props: {
      postsPagination: {
        next_page,
        results: posts,
      },
      preview,
    },
    revalidate: 60 * 60 * 24, // 24hrs
  };
};
